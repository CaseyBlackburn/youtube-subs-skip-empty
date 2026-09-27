// ==UserScript==
// @name         YouTube Subscriptions: skip empty pages
// @namespace    https://github.com/CaseyBlackburn/youtube-subs-skip-empty
// @version      1.0.0
// @description  Keeps the Subscriptions feed loading past pages that come back empty (e.g. every video on them is hidden) instead of getting stuck on grey placeholder cards.
// @author       CaseyBlackburn
// @license      MIT
// @homepageURL  https://github.com/CaseyBlackburn/youtube-subs-skip-empty
// @supportURL   https://github.com/CaseyBlackburn/youtube-subs-skip-empty/issues
// @updateURL    https://raw.githubusercontent.com/CaseyBlackburn/youtube-subs-skip-empty/main/youtube-subs-skip-empty.user.js
// @downloadURL  https://raw.githubusercontent.com/CaseyBlackburn/youtube-subs-skip-empty/main/youtube-subs-skip-empty.user.js
// @icon         https://www.youtube.com/favicon.ico
// @match        https://www.youtube.com/*
// @run-at       document-start
// @grant        none
// @noframes
// ==/UserScript==

(() => {
  'use strict';

  // Each "load more" keeps pulling pages until it has at least this many videos...
  const MIN_VIDEOS = 12;
  // ...or has fetched this many extra pages (each covers a few days of uploads).
  const MAX_EXTRA_PAGES = 40;

  const TAG = '[subs-skip-empty]';
  const nativeFetch = window.fetch;

  const subsAction = (json) =>
    (json.onResponseReceivedActions || [])
      .map((a) => a.appendContinuationItemsAction)
      .find((a) => a && String(a.targetId || '').includes('FEsubscriptions'));

  const splitItems = (list) => {
    const items = [];
    let continuation = null;
    for (const it of list || []) {
      if (it.continuationItemRenderer) continuation = it;
      else items.push(it);
    }
    return { items, continuation };
  };

  const countVideos = (items) => items.filter((it) => it.richItemRenderer).length;

  const tokenOf = (continuation) =>
    continuation?.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token;

  // YouTube sends innertube requests as Request objects with a gzip-compressed JSON body.
  const readBody = async (input, init) => {
    if (typeof init?.body === 'string') return init.body;
    if (!(input instanceof Request) || init?.body != null) return null;
    const req = input.clone();
    if (!/gzip/i.test(req.headers.get('content-encoding') || '')) return req.text();
    return new Response(req.body.pipeThrough(new DecompressionStream('gzip'))).text();
  };

  window.fetch = async function (input, init) {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input?.url;
    if (!url || !url.includes('/youtubei/v1/browse')) return nativeFetch.call(window, input, init);

    let body = null;
    try {
      body = JSON.parse(await readBody(input, init));
    } catch {}
    if (!body?.continuation) return nativeFetch.call(window, input, init);

    const res = await nativeFetch.call(window, input, init);
    if (!res.ok) return res;

    let json;
    try {
      json = await res.clone().json();
    } catch {
      return res;
    }
    const action = subsAction(json);
    if (!action) return res;

    let { items, continuation } = splitItems(action.continuationItems);
    if (countVideos(items) >= MIN_VIDEOS || !continuation) return res;

    // Replay the same request with each next token, reusing YouTube's own headers
    // but sending plain (uncompressed) JSON.
    const headers = new Headers(input instanceof Request ? input.headers : init?.headers);
    headers.delete('content-encoding');
    headers.set('content-type', 'application/json');
    const baseInit = {
      method: 'POST',
      headers,
      credentials: input instanceof Request ? input.credentials : init?.credentials ?? 'same-origin',
    };
    let pages = 0;
    try {
      while (continuation && countVideos(items) < MIN_VIDEOS && pages < MAX_EXTRA_PAGES) {
        const token = tokenOf(continuation);
        if (!token) break;
        const r = await nativeFetch(url, { ...baseInit, body: JSON.stringify({ ...body, continuation: token }) });
        if (!r.ok) break;
        const next = subsAction(await r.json());
        if (!next) break;
        pages++;
        const page = splitItems(next.continuationItems);
        items = items.concat(page.items);
        continuation = page.continuation;
      }
    } catch (err) {
      console.warn(TAG, 'stopped early:', err);
    }

    console.debug(TAG, `fetched ${pages} extra page(s), now ${countVideos(items)} video(s)`);
    action.continuationItems = continuation ? [...items, continuation] : items;
    return new Response(JSON.stringify(json), {
      status: res.status,
      statusText: res.statusText,
      headers: { 'content-type': 'application/json; charset=UTF-8' },
    });
  };
})();
