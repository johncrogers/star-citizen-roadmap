// Roadmap: every feature idea from ROADMAP (roadmap.data.js, generated from features/*.md), in
// priority order. "Up next" lists everything not shipped; "Shipped" lists the rest, newest first.
// Status filter in ?status=, permalinks as #f/<id>.
(function () {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const SITE = window.SITE || { links: [] };
  const META = window.ROADMAP_META || {};
  const PHASES = META.phases || {};
  const ALL = (window.ROADMAP || []).slice().sort((a, b) => a.priority - b.priority);
  const byId = new Map(ALL.map((f) => [f.id, f]));

  // How each status reads to players. Order is the order of the filter chips.
  const STATUS = {
    building: "In progress",
    ready: "Ready to build",
    groomed: "Planned",
    concept: "Idea",
    parked: "Paused",
    shipped: "Shipped",
    dropped: "Dropped",
  };

  const siteHref = (id) => ((SITE.links || []).find((l) => l.id === id) || {}).href || null;
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const fmtDate = (d) => { if (!d) return ""; const [y, m, day] = d.split("-").map(Number); return `${day} ${MONTHS[m - 1]} ${y}`; };

  // Ranks count only what's still to come, so #1 is always the next thing.
  const upcoming = ALL.filter((f) => f.status !== "shipped" && f.status !== "dropped");
  const rank = new Map(upcoming.map((f, i) => [f.id, i + 1]));
  const shipped = ALL.filter((f) => f.status === "shipped").sort((a, b) => (b.shipped || "").localeCompare(a.shipped || "") || a.priority - b.priority);
  const dropped = ALL.filter((f) => f.status === "dropped");

  const params = new URLSearchParams(location.search);
  let filter = STATUS[params.get("status")] ? params.get("status") : "";

  const setUrl = () => {
    try { history.replaceState(null, "", `${location.pathname}${filter ? `?status=${filter}` : ""}${location.hash}`); } catch (e) { /* file:// */ }
  };

  function renderFilters() {
    const count = (s) => ALL.filter((f) => f.status === s).length;
    const chip = (id, label, n) => `<button type="button" class="rm-chip${filter === id ? " on" : ""}" data-status="${id}" aria-pressed="${filter === id}">${esc(label)}<span class="n">${n}</span></button>`;
    $("filters").innerHTML = chip("", "All", ALL.length) +
      Object.entries(STATUS).filter(([s]) => count(s)).map(([s, label]) => chip(s, label, count(s))).join("");
  }

  function card(f) {
    const r = rank.get(f.id);
    const waiting = (f.depends || []).map((d) => byId.get(d)).filter((d) => d && d.status !== "shipped");
    const [done, total] = f.tasks || [0, 0];
    const showProgress = f.status !== "shipped" && total > 0 && done > 0;
    const changelog = siteHref("changelog");
    return `
      <article class="rm-card status-${esc(f.status)}" id="f-${esc(f.id)}">
        <div class="rm-rank" aria-label="${r ? `Priority ${r}` : "Shipped"}">${r ? `#${r}` : "✓"}</div>
        <div class="rm-body">
          <div class="rm-head">
            <h3>${esc(f.title)}</h3>
            <span class="status-badge s-${esc(f.status)}">${esc(STATUS[f.status] || f.status)}</span>
            ${PHASES[f.phase] ? `<span class="phase-tag">${esc(PHASES[f.phase])}</span>` : ""}
            <a class="permalink" href="#f/${esc(f.id)}" title="Link to this idea" aria-label="Link to ${esc(f.title)}">#</a>
          </div>
          <p>${esc(f.pitch)}</p>
          ${showProgress ? `<div class="progress" role="img" aria-label="${done} of ${total} tasks done"><span style="width:${Math.round((done / total) * 100)}%"></span></div><p class="small muted">${done} of ${total} tasks done</p>` : ""}
          ${waiting.length ? `<p class="small muted">Needs first: ${waiting.map((d) => `<a href="#f/${esc(d.id)}">${esc(d.title)}</a>`).join(", ")}</p>` : ""}
          ${f.status === "shipped" ? `<p class="small muted">Shipped ${esc(fmtDate(f.shipped))}${f.changelog && changelog ? ` · <a href="${esc(changelog)}#e/${esc(f.changelog)}">What's new →</a>` : ""}</p>` : ""}
        </div>
      </article>`;
  }

  function render() {
    renderFilters();
    const keep = (f) => !filter || f.status === filter;
    const sections = [
      ["Up next", upcoming.filter(keep), "Everything still to come, highest priority first."],
      ["Shipped", shipped.filter(keep), ""],
      ["Dropped", dropped.filter(keep), "Decided against, kept so the reasoning isn't lost."],
    ].filter(([, list]) => list.length);
    $("view").innerHTML = sections.length
      ? sections.map(([title, list, note]) => `<section class="rm-section"><h2>${esc(title)} <span class="muted">${list.length}</span></h2>${note ? `<p class="small muted">${esc(note)}</p>` : ""}${list.map(card).join("")}</section>`).join("")
      : `<p class="muted">Nothing with this status.</p>`;
    focusHash();
  }

  function focusHash() {
    document.querySelectorAll(".rm-card.target").forEach((el) => el.classList.remove("target"));
    const m = location.hash.match(/^#f\/(.+)$/);
    if (!m) return;
    const f = byId.get(decodeURIComponent(m[1]));
    if (!f) return;
    if (filter && f.status !== filter) { filter = ""; setUrl(); render(); return; }
    const el = document.getElementById(`f-${f.id}`);
    if (el) { el.classList.add("target"); el.scrollIntoView({ block: "start" }); }
  }

  $("filters").addEventListener("click", (ev) => {
    const b = ev.target.closest("button[data-status]");
    if (!b) return;
    filter = b.dataset.status;
    // Choosing a filter replaces any "jump to this idea" link, which would otherwise undo it.
    try { history.replaceState(null, "", location.pathname + location.search); } catch (e) { location.hash = ""; }
    setUrl();
    render();
  });
  window.addEventListener("hashchange", focusHash);

  $("siteLinks").innerHTML = (SITE.links || []).map((l) => `<a href="${esc(l.href)}">${esc(l.label)} →</a>`).join("");
  $("meta").textContent = `${upcoming.length} ideas to come · ${shipped.length} shipped · updated ${fmtDate(META.updated)}`;
  render();
})();
