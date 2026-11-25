/* =====================================================================
 Live Custom SVG Emoji Reactions (2 to 4 players) — Premium Animated Edition
 • প্রতিটি ইমোজির নিজস্ব চরিত্র-অ্যানিমেশন (হার্টবিট, শিখা, ঝলক, অশ্রু, ইত্যাদি)
 • ফ্লোটিং ইফেক্ট: স্প্রিং পপ-ইন + রিং + থিম অনুযায়ী পার্টিকল বার্স্ট
 • Firebase ডেটা শেপ ও exported ফাংশন আগের মতোই (initEmoji / startEmojiRoom / stopEmojiRoom)
 ===================================================================== */
import { ref, set, onValue, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const COOLDOWN_MS = 2000;
const MAX_FLOATS = 8;
const INK = "#1B2A6B";

/* ---------------------------------------------------------------------
   SVG হেল্পার
   __ID__ প্লেসহোল্ডার প্রতিবার ইউনিক আইডিতে বদলে যায়, তাই একই ইমোজি
   একসাথে অনেকবার দেখালেও gradient/clipPath আইডি মিশে যায় না।
   --------------------------------------------------------------------- */
const S = (inner) =>
  `<svg viewBox="0 0 48 48" fill="none" aria-hidden="true" focusable="false">${inner}</svg>`;

const gradFace = (id, a, b, c) =>
  `<radialGradient id="${id}__ID__" cx=".34" cy=".26" r=".92"><stop offset="0" stop-color="${a}"/><stop offset=".55" stop-color="${b}"/><stop offset="1" stop-color="${c}"/></radialGradient>`;

const YELLOW = ["#FFF08F", "#FFD84D", "#FFB41F"];

const faceBase = (id = "fy") =>
  `<circle cx="24" cy="24" r="19" fill="url(#${id}__ID__)" stroke="${INK}" stroke-width="3"/>` +
  `<path d="M11.5 17c1.5-3.4 4.5-5.8 8-6.6" stroke="#fff" stroke-width="2.6" stroke-linecap="round" opacity=".6"/>`;

const sparkle = (x, y, s = 1, delay = 0, fill = "#FFD84D") =>
  `<g transform="translate(${x} ${y}) scale(${s})"><path class="pk-a pk-twinkle" style="--sd:${delay}s" d="M0-4.2 1.2-1.2 4.2 0 1.2 1.2 0 4.2-1.2 1.2-4.2 0-1.2-1.2z" fill="${fill}" stroke="${INK}" stroke-width="1.3" stroke-linejoin="round"/></g>`;

/* ---------------------------------------------------------------------
   ১২টি কাস্টম অ্যানিমেটেড SVG ইমোজি (নোটবুক-স্টিকার স্টাইল)
   --------------------------------------------------------------------- */
const CUSTOM_EMOJIS = {
  heart: {
    label: "Love",
    svg: S(`
<defs><radialGradient id="hr__ID__" cx=".3" cy=".25" r=".95"><stop offset="0" stop-color="#FF9DB0"/><stop offset=".5" stop-color="#FF4D6D"/><stop offset="1" stop-color="#E0204A"/></radialGradient></defs>
<g class="pk-a pk-beat">
<path d="M24 42S6 30.8 6 17.5C6 11.4 10.6 7 16 7c3.4 0 6.3 1.8 8 4.5C25.7 8.8 28.6 7 32 7c5.4 0 10 4.4 10 10.5C42 30.8 24 42 24 42z" fill="url(#hr__ID__)" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
<path d="M13 15.5c.8-2.5 3-4 5.5-4" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".85"/>
<circle cx="11.2" cy="20.5" r="1.5" fill="#fff" opacity=".85"/>
</g>
${sparkle(43, 5, 1, 0)}${sparkle(5, 5, 0.8, 0.6, "#FFB3C1")}`)
  },

  laugh: {
    label: "Haha",
    svg: S(`
<defs>${gradFace("fy", ...YELLOW)}</defs>
<g class="pk-a pk-laugh">
${faceBase()}
<path d="M13 20l5-2.5L13 15M35 20l-5-2.5L35 15" stroke="${INK}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
<g class="pk-a pk-mouth">
<path d="M14 26h20c0 6.5-4.5 11-10 11s-10-4.5-10-11z" fill="${INK}" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/>
<path d="M15.5 26.8h17c0 1.5-.2 2.4-.6 3H16.1c-.4-.6-.6-1.5-.6-3z" fill="#fff"/>
<path d="M18 33.5c1.8-1.5 4-2 6-2s4.2.5 6 2c-1.8 2-3.8 3.5-6 3.5s-4.2-1.5-6-3.5z" fill="#FF5A79"/>
</g>
<g transform="translate(6.5 27) rotate(-40)"><path class="pk-a pk-tear" d="M0-5C2-2 3.6 0 3.6 2.2A3.6 3.6 0 0 1-3.6 2.2C-3.6 0-2-2 0-5z" fill="#4CC9F0" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/></g>
<g transform="translate(41.5 27) rotate(40)"><path class="pk-a pk-tear" style="--sd:.18s" d="M0-5C2-2 3.6 0 3.6 2.2A3.6 3.6 0 0 1-3.6 2.2C-3.6 0-2-2 0-5z" fill="#4CC9F0" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/></g>
</g>`)
  },

  fire: {
    label: "Fire",
    svg: S(`
<defs><linearGradient id="fl__ID__" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#FF3B30"/><stop offset=".55" stop-color="#FF6B2B"/><stop offset="1" stop-color="#FFB41F"/></linearGradient></defs>
<g class="pk-a pk-flame">
<path d="M25 5c1 8-6 11-6 18 0 2.5 1.5 4.5 3.5 5.5-1-3.5 2-7 5-8.5.5 4.5 4.5 7 4.5 12.5 0 6-4.5 10.5-10.5 10.5S11 38.5 11 32c0-7.5 6.5-12.5 8-19 2.5 2 3.5 4.5 3 7 1-5 1.5-10 3-15z" fill="url(#fl__ID__)" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
<g class="pk-a pk-flame2">
<path d="M23.5 42c-3.8 0-6.5-2.6-6.5-6.2 0-3.2 2.2-5.4 4.2-7.8.4 2.2 1.8 3.3 3.3 3.8.5-2.2 2-3.5 3.3-4.3 1.5 2.4 2.2 4.8 2.2 8.3 0 3.6-2.7 6.2-6.5 6.2z" fill="#FFD84D"/>
<ellipse cx="23.5" cy="37.2" rx="3" ry="3.3" fill="#FFF6B0"/>
</g>
</g>
<circle class="pk-a pk-spark" style="--sd:0s" cx="12" cy="14" r="1.7" fill="#FFB41F"/>
<circle class="pk-a pk-spark" style="--sd:.45s" cx="37" cy="18" r="1.5" fill="#FFD84D"/>
<circle class="pk-a pk-spark" style="--sd:.9s" cx="33" cy="6" r="1.4" fill="#FF6B2B"/>`)
  },

  cool: {
    label: "Cool",
    svg: S(`
<defs>${gradFace("fy", ...YELLOW)}
<linearGradient id="ln__ID__" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3A57E8"/><stop offset="1" stop-color="${INK}"/></linearGradient>
<clipPath id="gl__ID__"><rect x="8" y="16" width="14" height="9" rx="3"/><rect x="26" y="16" width="14" height="9" rx="3"/></clipPath></defs>
<g class="pk-a pk-bob">
${faceBase()}
<path d="M17 32c3.5 2.8 9.5 2.6 14-1.6" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
<g class="pk-a pk-glasses">
<rect x="8" y="16" width="14" height="9" rx="3" fill="url(#ln__ID__)" stroke="${INK}" stroke-width="2.6"/>
<rect x="26" y="16" width="14" height="9" rx="3" fill="url(#ln__ID__)" stroke="${INK}" stroke-width="2.6"/>
<path d="M22 19.5h4" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
<path d="M11.5 19.5l3-1.4M29.5 19.5l3-1.4" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".85"/>
<g clip-path="url(#gl__ID__)"><g class="pk-a pk-glint"><rect x="6" y="14" width="3.5" height="13" fill="#fff" opacity=".8" transform="skewX(-20)"/></g></g>
</g>
</g>
${sparkle(41, 10, 1, 0.5)}`)
  },

  thumbs: {
    label: "Nice",
    svg: S(`
<defs>${gradFace("fy", ...YELLOW)}
<linearGradient id="bl__ID__" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5B7BFF"/><stop offset="1" stop-color="#2F4BD8"/></linearGradient></defs>
<g class="pk-a pk-thumb">
<rect x="7" y="21" width="9" height="19" rx="3" fill="url(#bl__ID__)" stroke="${INK}" stroke-width="3"/>
<path d="M16 23l5.5-12.5c1-2.2 4.5-2 4.8.5l.7 8h10c2.8 0 4.6 2.6 3.8 5.3l-2.6 10.5C37.5 37.8 35 40 32 40H16V23z" fill="url(#fy__ID__)" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
<path d="M21 29h13M21 33.2h12.2M21 37.2h9.4" stroke="#E59A00" stroke-width="1.8" stroke-linecap="round" opacity=".55"/>
<path d="M22.6 17.6l2-4.4" stroke="#fff" stroke-width="2.2" stroke-linecap="round" opacity=".75"/>
<path d="M10.2 25v10" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".5"/>
</g>
<g stroke="#FF9F1C" stroke-width="2.6" stroke-linecap="round">
<path class="pk-a pk-ray" d="M16.5 9.5l-3.2-2.8"/>
<path class="pk-a pk-ray" style="--sd:.06s" d="M32 8l3.4-2.6"/>
<path class="pk-a pk-ray" style="--sd:.03s" d="M24.6 5V1.4"/>
</g>`)
  },

  star: {
    label: "Wow",
    svg: S(`
<defs>${gradFace("fy", ...YELLOW)}</defs>
<g class="pk-a pk-bob">
${faceBase()}
<circle cx="10.5" cy="28.5" r="3" fill="#FF8FA3" opacity=".55"/><circle cx="37.5" cy="28.5" r="3" fill="#FF8FA3" opacity=".55"/>
<path class="pk-a pk-eye" d="M16 14l1.6 3.4 3.7.5-2.7 2.6.6 3.7-3.2-1.8-3.2 1.8.6-3.7-2.7-2.6 3.7-.5L16 14z" fill="#FF4D6D" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/>
<path class="pk-a pk-eye" style="--sd:.15s" d="M32 14l1.6 3.4 3.7.5-2.7 2.6.6 3.7-3.2-1.8-3.2 1.8.6-3.7-2.7-2.6 3.7-.5L32 14z" fill="#FF4D6D" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/>
<g class="pk-a pk-gasp"><path d="M16 28.5c1.2 6.5 14.8 6.5 16 0z" fill="${INK}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/></g>
</g>
${sparkle(5, 8, 1, 0)}${sparkle(43, 7, 0.9, 0.5, "#FF8FA3")}${sparkle(42, 41, 0.8, 1)}`)
  },

  crown: {
    label: "King",
    svg: S(`
<defs>
<linearGradient id="gd__ID__" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF08F"/><stop offset=".5" stop-color="#FFD84D"/><stop offset="1" stop-color="#FFB41F"/></linearGradient>
<clipPath id="cw__ID__"><path d="M7 34L4 15l11 8 9-12 9 12 11-8-3 19H7z"/><rect x="8" y="34" width="32" height="6" rx="2"/></clipPath>
</defs>
<g class="pk-a pk-crown">
<path d="M7 34L4 15l11 8 9-12 9 12 11-8-3 19H7z" fill="url(#gd__ID__)" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
<circle cx="4" cy="14.5" r="2.7" fill="#FFF2A8" stroke="${INK}" stroke-width="2.2"/>
<circle cx="24" cy="10.5" r="2.9" fill="#FFF2A8" stroke="${INK}" stroke-width="2.2"/>
<circle cx="44" cy="14.5" r="2.7" fill="#FFF2A8" stroke="${INK}" stroke-width="2.2"/>
<rect x="8" y="34" width="32" height="6" rx="2" fill="#FF9F1C" stroke="${INK}" stroke-width="3"/>
<g class="pk-a pk-gem"><circle cx="24" cy="25" r="2.8" fill="#FF4D6D" stroke="${INK}" stroke-width="1.4"/><circle cx="23.2" cy="24.2" r=".8" fill="#fff"/></g>
<g class="pk-a pk-gem" style="--sd:.25s"><circle cx="15" cy="28" r="2.2" fill="#2F4BD8" stroke="${INK}" stroke-width="1.3"/><circle cx="14.4" cy="27.4" r=".65" fill="#fff"/></g>
<g class="pk-a pk-gem" style="--sd:.5s"><circle cx="33" cy="28" r="2.2" fill="#2F4BD8" stroke="${INK}" stroke-width="1.3"/><circle cx="32.4" cy="27.4" r=".65" fill="#fff"/></g>
<g clip-path="url(#cw__ID__)"><g class="pk-a pk-sweep"><rect x="8" y="6" width="5" height="36" fill="#fff" opacity=".6" transform="skewX(-20)"/></g></g>
</g>
${sparkle(8, 5, 0.9, 0)}${sparkle(41, 4, 1, 0.6)}`)
  },

  shock: {
    label: "OMG",
    svg: S(`
<defs>${gradFace("fy", ...YELLOW)}</defs>
<g class="pk-a pk-jolt">
${faceBase()}
<circle cx="17" cy="20" r="5.2" fill="#fff" stroke="${INK}" stroke-width="2.4"/>
<circle cx="31" cy="20" r="5.2" fill="#fff" stroke="${INK}" stroke-width="2.4"/>
<g class="pk-a pk-pupil"><circle cx="17" cy="20" r="2.4" fill="${INK}"/><circle cx="16.2" cy="19.2" r=".8" fill="#fff"/></g>
<g class="pk-a pk-pupil"><circle cx="31" cy="20" r="2.4" fill="${INK}"/><circle cx="30.2" cy="19.2" r=".8" fill="#fff"/></g>
<path class="pk-a pk-browup" d="M11 12.5c1.6-1.6 4.4-2 7-1M37 12.5c-1.6-1.6-4.4-2-7-1" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>
<g class="pk-a pk-gasp"><ellipse cx="24" cy="33" rx="4.4" ry="6" fill="${INK}"/><ellipse cx="24" cy="36.2" rx="2.7" ry="2.2" fill="#FF5A79"/></g>
</g>
<g transform="translate(41 12)"><path class="pk-a pk-sweat" d="M0-5C2-2 3.4 0 3.4 2A3.4 3.4 0 0 1-3.4 2C-3.4 0-2-2 0-5z" fill="#4CC9F0" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/></g>
<path class="pk-a pk-lines" d="M24 1.5V-1.5M13 4L11 1.5M35 4l2-2.5" stroke="#FF4D6D" stroke-width="2.2" stroke-linecap="round"/>`)
  },

  cry: {
    label: "Sad",
    svg: S(`
<defs>${gradFace("fy", ...YELLOW)}</defs>
<g class="pk-a pk-sag">
${faceBase()}
<path d="M12.5 21c1.4-2.6 4.6-2.6 6 0M29.5 21c1.4-2.6 4.6-2.6 6 0" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
<path d="M11.5 15l7-2.5M36.5 15l-7-2.5" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>
<g class="pk-a pk-stream"><path d="M15.5 23.5v12" stroke="#4CC9F0" stroke-width="5" stroke-linecap="round"/><path d="M14.5 24.5v9" stroke="#fff" stroke-width="1.2" stroke-linecap="round" opacity=".6"/></g>
<g class="pk-a pk-stream" style="--sd:.12s"><path d="M32.5 23.5v12" stroke="#4CC9F0" stroke-width="5" stroke-linecap="round"/><path d="M31.5 24.5v9" stroke="#fff" stroke-width="1.2" stroke-linecap="round" opacity=".6"/></g>
<path class="pk-a pk-quiver" d="M17 36.5c1.5-4.6 12.5-4.6 14 0z" fill="${INK}" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/>
</g>
<g transform="translate(15.5 38)"><circle class="pk-a pk-drip" cx="0" cy="0" r="2.2" fill="#4CC9F0"/></g>
<g transform="translate(32.5 38)"><circle class="pk-a pk-drip" style="--sd:.12s" cx="0" cy="0" r="2.2" fill="#4CC9F0"/></g>`)
  },

  angry: {
    label: "Grr",
    svg: S(`
<defs>${gradFace("fr", "#FF9A8A", "#FF4D4D", "#E02A3A")}</defs>
<g class="pk-a pk-rage">
${faceBase("fr")}
<path d="M11.5 14.5l8.5 5M36.5 14.5l-8.5 5" stroke="${INK}" stroke-width="3.4" stroke-linecap="round"/>
<circle cx="17" cy="23.5" r="3.2" fill="#fff" stroke="${INK}" stroke-width="2"/>
<circle cx="31" cy="23.5" r="3.2" fill="#fff" stroke="${INK}" stroke-width="2"/>
<circle cx="17.4" cy="23.8" r="1.6" fill="${INK}"/><circle cx="30.6" cy="23.8" r="1.6" fill="${INK}"/>
<path d="M16.5 36c1.5-3.8 13.5-3.8 15 0z" fill="#fff" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>
<path d="M24 33.6V35.8M20 34V35.6M28 34V35.6" stroke="${INK}" stroke-width="1.3" stroke-linecap="round"/>
<g class="pk-a pk-vein" stroke="#A8122B" stroke-width="2.2" stroke-linecap="round" fill="none">
<path d="M28.6 9.1c1.4 0 1.4 1.5 1.4 1.5M33.4 9.1c-1.4 0-1.4 1.5-1.4 1.5M28.6 13.9c1.4 0 1.4-1.5 1.4-1.5M33.4 13.9c-1.4 0-1.4-1.5-1.4-1.5"/>
</g>
</g>
<circle class="pk-a pk-steam" style="--sd:0s" cx="9" cy="8" r="3.2" fill="#fff" stroke="${INK}" stroke-width="1.8"/>
<circle class="pk-a pk-steam" style="--sd:.5s" cx="39" cy="8" r="3.2" fill="#fff" stroke="${INK}" stroke-width="1.8"/>`)
  },

  think: {
    label: "Hmm",
    svg: S(`
<defs>${gradFace("fy", ...YELLOW)}</defs>
<g class="pk-a pk-tilt">
${faceBase()}
<circle cx="17" cy="21" r="4" fill="#fff" stroke="${INK}" stroke-width="2"/>
<circle cx="31" cy="21" r="4" fill="#fff" stroke="${INK}" stroke-width="2"/>
<g class="pk-a pk-look"><circle cx="17" cy="21" r="1.9" fill="${INK}"/><circle cx="31" cy="21" r="1.9" fill="${INK}"/></g>
<path d="M12.5 14.5c1.8-1.2 4.2-1.4 6.5-.6" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>
<path class="pk-a pk-brow" d="M28.5 12c2.3-1.6 5-1.6 7.2-.2" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>
<path d="M19 32c3-1.2 7-.8 10 1.2" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
</g>
<circle class="pk-a pk-dot" style="--sd:0s" cx="36" cy="8" r="1.5" fill="#fff" stroke="${INK}" stroke-width="1.4"/>
<circle class="pk-a pk-dot" style="--sd:.25s" cx="40" cy="4.5" r="2.1" fill="#fff" stroke="${INK}" stroke-width="1.4"/>
<circle class="pk-a pk-dot" style="--sd:.5s" cx="44.5" cy="1.5" r="3" fill="#fff" stroke="${INK}" stroke-width="1.4"/>`)
  },

  hundred: {
    label: "100%",
    svg: S(`
<defs>
<linearGradient id="gg__ID__" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3DDC9A"/><stop offset=".55" stop-color="#1F9D6B"/><stop offset="1" stop-color="#157A53"/></linearGradient>
<clipPath id="cg__ID__"><rect x="4" y="8" width="40" height="32" rx="10"/></clipPath>
</defs>
<g class="pk-a pk-stamp">
<rect x="4" y="8" width="40" height="32" rx="10" fill="url(#gg__ID__)" stroke="${INK}" stroke-width="3"/>
<path d="M10 14.5c1-2 3-3.2 5.5-3.2h8" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".5"/>
<text x="24" y="28.6" text-anchor="middle" fill="#fff" stroke="#0E5F42" stroke-width="2.4" stroke-linejoin="round" paint-order="stroke" font-family="system-ui,-apple-system,Segoe UI,sans-serif" font-weight="900" font-size="17">100</text>
<path class="pk-a pk-draw" pathLength="1" d="M11 33.2h26" stroke="#FFD84D" stroke-width="2.6" stroke-linecap="round"/>
<path class="pk-a pk-draw" pathLength="1" style="--sd:.15s" d="M15 36.8h18" stroke="#FFD84D" stroke-width="2.2" stroke-linecap="round"/>
<g clip-path="url(#cg__ID__)"><g class="pk-a pk-sweep"><rect x="4" y="6" width="5" height="36" fill="#fff" opacity=".45" transform="skewX(-20)"/></g></g>
</g>
${sparkle(6, 5, 1, 0.2)}${sparkle(43, 43, 0.9, 0.7)}`)
  }
};

// টপ বারের জন্য অ্যানিমেটেড স্মাইলি বাটন আইকন (চোখ পিটপিট করে)
const BTN_SVG = `<svg class="eb-face" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9.5" fill="#FFD84D" stroke="${INK}" stroke-width="2.2"/><g class="pk-a pk-blink"><circle cx="9" cy="10" r="1.3" fill="${INK}"/><circle cx="15" cy="10" r="1.3" fill="${INK}"/></g><path d="M8.2 14c1 2.2 6.6 2.2 7.6 0" stroke="${INK}" stroke-width="2"/></svg>`;

/* ---------------------------------------------------------------------
   ফ্লোটিং ইফেক্টের থিম: রিং/গ্লো রঙ + পার্টিকলের ধরন
   mode: burst (চারদিকে) | up (উপরে) | down (নিচে)
   --------------------------------------------------------------------- */
const FX = {
  heart:   { c: "#FF4D6D", mode: "up",    n: 10, p: [["heart", "#FF4D6D"], ["heart", "#FF8FA3"], ["heart", "#FFB3C1"]] },
  laugh:   { c: "#FFD84D", mode: "burst", n: 10, p: [["drop", "#4CC9F0"], ["star", "#FFD84D"], ["drop", "#8FE3FF"]] },
  fire:    { c: "#FF6B2B", mode: "up",    n: 11, p: [["flame", "#FF6B2B"], ["flame", "#FFB41F"], ["dot", "#FFD84D"]] },
  cool:    { c: "#4CC9F0", mode: "burst", n: 9,  p: [["star", "#FFFFFF"], ["star", "#4CC9F0"], ["star", "#FFD84D"]] },
  thumbs:  { c: "#2F4BD8", mode: "burst", n: 9,  p: [["star", "#FFD84D"], ["dot", "#4CC9F0"], ["star", "#FFFFFF"]] },
  star:    { c: "#FFD84D", mode: "burst", n: 12, p: [["star", "#FFD84D"], ["star", "#FF4D6D"], ["star", "#FFFFFF"]] },
  crown:   { c: "#FF9F1C", mode: "burst", n: 12, p: [["star", "#FFD84D"], ["dot", "#FF4D6D"], ["dot", "#2F4BD8"], ["star", "#FFFFFF"]] },
  shock:   { c: "#4CC9F0", mode: "burst", n: 7,  p: [["bang", "#FFD84D"], ["bang", "#FF4D6D"]] },
  cry:     { c: "#4CC9F0", mode: "down",  n: 9,  p: [["drop", "#4CC9F0"], ["drop", "#8FE3FF"]] },
  angry:   { c: "#FF4D4D", mode: "burst", n: 8,  p: [["anger", "#FF2E4D"], ["puff", "#E6E9F5"]] },
  think:   { c: "#A78BFA", mode: "up",    n: 6,  p: [["q", "#A78BFA"], ["dot", "#FFD84D"]] },
  hundred: { c: "#1F9D6B", mode: "burst", n: 14, p: [["confetti", "#FF4D6D"], ["confetti", "#FFD84D"], ["confetti", "#4CC9F0"], ["star", "#FFFFFF"]] }
};

const outline = (d, w) =>
  `<path d="${d}" stroke="${INK}" stroke-width="${w + 3}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>` +
  `<path d="${d}" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;

const PARTS = {
  heart: `<svg viewBox="0 0 24 24"><path d="M12 21S3 15.4 3 8.8C3 5.6 5.4 3.5 8 3.5c1.7 0 3.1.9 4 2.3.9-1.4 2.3-2.3 4-2.3 2.6 0 5 2.1 5 5.3C21 15.4 12 21 12 21z" fill="currentColor" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/></svg>`,
  star: `<svg viewBox="0 0 24 24"><path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z" fill="currentColor" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/></svg>`,
  drop: `<svg viewBox="0 0 24 24"><path d="M12 3c3 4.5 6 7.5 6 11a6 6 0 0 1-12 0c0-3.5 3-6.5 6-11z" fill="currentColor" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/></svg>`,
  flame: `<svg viewBox="0 0 24 24"><path d="M12 2c1 5-5 7-5 12a5 5 0 0 0 10 0c0-2-1-3.5-2-5-.3 2-1.5 2.8-2.4 3 .8-3.5.4-7-.6-10z" fill="currentColor" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/></svg>`,
  puff: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="currentColor" stroke="${INK}" stroke-width="2.4"/></svg>`,
  dot: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="6" fill="currentColor" stroke="${INK}" stroke-width="2.4"/></svg>`,
  confetti: `<svg viewBox="0 0 24 24"><rect x="7" y="2" width="10" height="20" rx="3" fill="currentColor" stroke="${INK}" stroke-width="2"/></svg>`,
  bang: `<svg viewBox="0 0 24 24">${outline("M12 4v9", 4)}<circle cx="12" cy="20" r="3.6" fill="${INK}"/><circle cx="12" cy="20" r="1.8" fill="currentColor"/></svg>`,
  anger: `<svg viewBox="0 0 24 24">${outline("M4 9c3.6 0 3.6-3.6 3.6-3.6M20 9c-3.6 0-3.6-3.6-3.6-3.6M4 15c3.6 0 3.6 3.6 3.6 3.6M20 15c-3.6 0-3.6 3.6-3.6 3.6", 3)}</svg>`,
  q: `<svg viewBox="0 0 24 24">${outline("M7.5 8.5a4.5 4.5 0 1 1 6.8 3.9c-1.6 1-2.3 1.8-2.3 3.4", 3.4)}<circle cx="12" cy="21" r="3.4" fill="${INK}"/><circle cx="12" cy="21" r="1.7" fill="currentColor"/></svg>`
};

let uidCounter = 0;
function renderSvg(key) {
  const id = `pk${++uidCounter}`;
  return CUSTOM_EMOJIS[key].svg.replaceAll("__ID__", id);
}

function buildParticles(key) {
  const fx = FX[key];
  if (!fx) return "";
  let html = "";
  for (let i = 0; i < fx.n; i++) {
    const [shape, color] = fx.p[i % fx.p.length];
    let ang, dist, dl;
    if (fx.mode === "up") {
      ang = -90 + (Math.random() * 100 - 50);
      dist = 70 + Math.random() * 60;
      dl = 0.1 + i * 0.09;
    } else if (fx.mode === "down") {
      ang = 90 + (Math.random() * 80 - 40);
      dist = 60 + Math.random() * 50;
      dl = 0.15 + i * 0.07;
    } else {
      ang = (360 / fx.n) * i + (Math.random() * 24 - 12) - 90;
      dist = 62 + Math.random() * 50;
      dl = 0.1 + Math.random() * 0.22;
    }
    const rad = (ang * Math.PI) / 180;
    const dx = Math.cos(rad) * dist;
    const dy = Math.sin(rad) * dist;
    const size = 10 + Math.random() * 11;
    const rot = Math.round(Math.random() * 180 - 90);
    const dur = 1.1 + Math.random() * 0.6;
    html += `<i class="ef-p" style="--dx:${dx.toFixed(1)}px;--dy:${dy.toFixed(1)}px;--rot:${rot}deg;--s:${size.toFixed(1)}px;--dur:${dur.toFixed(2)}s;--dl:${dl.toFixed(2)}s;color:${color}">${PARTS[shape]}</i>`;
  }
  return html;
}

let unsubEmoji = null;
let currentDb = null;
let currentRoom = null;
let getUserInfo = null;
let lastSentAt = 0;
let initialized = false;

export function initEmoji() {
  if (initialized) return;
  initialized = true;

  const style = document.createElement("style");
  style.id = "pk-emoji-style";
  style.textContent = `
    /* ============ ইমোজির ভেতরের অ্যানিমেশন (picker + floating দুই জায়গাতেই) ============ */
    .pk-a {
      transform-box: fill-box; transform-origin: center;
      animation-duration: 1s; animation-timing-function: ease-in-out;
      animation-iteration-count: infinite; animation-fill-mode: both;
      animation-delay: calc(var(--ad, 0s) + var(--sd, 0s));
    }
    .pk-beat    { animation-name: pkBeat;    animation-duration: 1.15s; }
    .pk-laugh   { animation-name: pkLaugh;   animation-duration: .7s; }
    .pk-mouth   { animation-name: pkMouth;   animation-duration: .7s; transform-origin: 50% 0; }
    .pk-tear    { animation-name: pkTear;    animation-duration: 1.1s; animation-timing-function: ease-out; }
    .pk-flame   { animation-name: pkFlame;   animation-duration: .9s; transform-origin: 50% 100%; }
    .pk-flame2  { animation-name: pkFlame2;  animation-duration: .7s; transform-origin: 50% 100%; }
    .pk-spark   { animation-name: pkSpark;   animation-duration: 1.4s; animation-timing-function: ease-out; }
    .pk-glasses { animation-name: pkGlasses; animation-duration: 4s; }
    .pk-glint   { animation-name: pkGlint;   animation-duration: 2.8s; }
    .pk-twinkle { animation-name: pkTwinkle; animation-duration: 1.8s; }
    .pk-eye     { animation-name: pkEye;     animation-duration: 1s; }
    .pk-thumb   { animation-name: pkThumb;   animation-duration: 1.8s; transform-origin: 30% 90%; }
    .pk-ray     { animation-name: pkRay;     animation-duration: 1.8s; animation-timing-function: ease-out; }
    .pk-bob     { animation-name: pkBob;     animation-duration: 1.6s; }
    .pk-gasp    { animation-name: pkGasp;    animation-duration: 1s; transform-origin: 50% 0; }
    .pk-crown   { animation-name: pkCrown;   animation-duration: 1.8s; transform-origin: 50% 100%; }
    .pk-sweep   { animation-name: pkSweep;   animation-duration: 2.4s; }
    .pk-gem     { animation-name: pkGem;     animation-duration: 1.4s; }
    .pk-jolt    { animation-name: pkJolt;    animation-duration: 2s; }
    .pk-pupil   { animation-name: pkPupil;   animation-duration: 2s; }
    .pk-browup  { animation-name: pkBrowUp;  animation-duration: 2s; }
    .pk-lines   { animation-name: pkLines;   animation-duration: 2s; }
    .pk-sweat   { animation-name: pkSweat;   animation-duration: 1.6s; animation-timing-function: ease-in; }
    .pk-sag     { animation-name: pkSag;     animation-duration: 2s; transform-origin: 50% 100%; }
    .pk-stream  { animation-name: pkStream;  animation-duration: 1.5s; transform-origin: 50% 0; animation-timing-function: ease-out; }
    .pk-drip    { animation-name: pkDrip;    animation-duration: 1.5s; animation-timing-function: ease-in; }
    .pk-quiver  { animation-name: pkQuiver;  animation-duration: .22s; }
    .pk-rage    { animation-name: pkRage;    animation-duration: 1.3s; animation-timing-function: linear; }
    .pk-steam   { animation-name: pkSteam;   animation-duration: 1.3s; animation-timing-function: ease-out; }
    .pk-vein    { animation-name: pkVein;    animation-duration: .7s; }
    .pk-tilt    { animation-name: pkTilt;    animation-duration: 3s; }
    .pk-look    { animation-name: pkLook;    animation-duration: 3s; }
    .pk-brow    { animation-name: pkBrow;    animation-duration: 3s; }
    .pk-dot     { animation-name: pkDot;     animation-duration: 2.4s; }
    .pk-stamp   { animation-name: pkStamp;   animation-duration: 2.6s; }
    .pk-draw    { animation-name: pkDraw;    animation-duration: 2.6s; stroke-dasharray: 1; stroke-dashoffset: 1; }
    .pk-blink   { animation-name: pkBlink;   animation-duration: 3.6s; }

    @keyframes pkBeat { 0%,100% { transform: scale(1); } 14% { transform: scale(1.14); } 28% { transform: scale(1); } 42% { transform: scale(1.1); } 70% { transform: scale(1); } }
    @keyframes pkLaugh { 0%,50%,100% { transform: translateY(0) rotate(0); } 25% { transform: translateY(-2.4px) rotate(-4deg); } 75% { transform: translateY(-2.4px) rotate(4deg); } }
    @keyframes pkMouth { 0%,50%,100% { transform: scaleY(1); } 25%,75% { transform: scaleY(.8); } }
    @keyframes pkTear { 0% { opacity: 0; transform: translateY(3px) scale(.5); } 25% { opacity: 1; transform: translateY(0) scale(1); } 70% { opacity: 1; transform: translateY(-5px) scale(1); } 100% { opacity: 0; transform: translateY(-9px) scale(.7); } }
    @keyframes pkFlame { 0%,100% { transform: scale(1,1) skewX(0deg); } 30% { transform: scale(.95,1.07) skewX(-3deg); } 60% { transform: scale(1.04,.96) skewX(3deg); } }
    @keyframes pkFlame2 { 0%,100% { transform: scale(1,1) skewX(0deg); } 35% { transform: scale(1.06,.93) skewX(3deg); } 65% { transform: scale(.94,1.08) skewX(-3deg); } }
    @keyframes pkSpark { 0% { opacity: 0; transform: translateY(6px) scale(.5); } 20% { opacity: 1; transform: translateY(0) scale(1); } 100% { opacity: 0; transform: translateY(-12px) scale(.3); } }
    @keyframes pkGlasses { 0%,12% { opacity: 0; transform: translateY(-10px); } 20% { opacity: 1; transform: translateY(1.5px); } 26%,100% { opacity: 1; transform: translateY(0); } }
    @keyframes pkGlint { 0%,50% { transform: translateX(0); } 85%,100% { transform: translateX(46px); } }
    @keyframes pkTwinkle { 0%,100% { opacity: 0; transform: scale(.2) rotate(0deg); } 40% { opacity: 1; transform: scale(1.15) rotate(45deg); } 60% { opacity: 1; transform: scale(1) rotate(60deg); } }
    @keyframes pkEye { 0%,100% { transform: scale(1) rotate(0deg); } 50% { transform: scale(1.28) rotate(14deg); } }
    @keyframes pkThumb { 0%,52%,100% { transform: rotate(0) scale(1); } 14% { transform: rotate(-18deg) scale(1.1) translateY(-1px); } 28% { transform: rotate(6deg) scale(.98); } 40% { transform: rotate(-3deg) scale(1.02); } }
    @keyframes pkRay { 0%,12% { opacity: 0; transform: scale(.4); } 24% { opacity: 1; transform: scale(1); } 50%,100% { opacity: 0; transform: scale(1.25); } }
    @keyframes pkBob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-2px); } }
    @keyframes pkGasp { 0%,100% { transform: scale(1,1); } 50% { transform: scale(1.08,1.2); } }
    @keyframes pkCrown { 0%,100% { transform: rotate(-3deg) translateY(0); } 50% { transform: rotate(3deg) translateY(-2px); } }
    @keyframes pkSweep { 0%,45% { transform: translateX(-8px); } 80%,100% { transform: translateX(56px); } }
    @keyframes pkGem { 0%,100% { transform: scale(1); } 50% { transform: scale(1.3); } }
    @keyframes pkJolt { 0%,24%,100% { transform: scale(1) rotate(0); } 4% { transform: scale(1.14) rotate(-3deg); } 8% { transform: scale(1.1) rotate(3deg); } 12% { transform: scale(1.12) rotate(-2deg); } 16% { transform: scale(1.08) rotate(1deg); } }
    @keyframes pkPupil { 0%,60%,100% { transform: scale(1); } 4%,40% { transform: scale(.55); } }
    @keyframes pkBrowUp { 0%,60%,100% { transform: translateY(0); } 4%,40% { transform: translateY(-2.6px); } }
    @keyframes pkLines { 0%,10% { opacity: 0; transform: scale(.6); } 18% { opacity: 1; transform: scale(1.15); } 40% { opacity: 1; transform: scale(1); } 55%,100% { opacity: 0; transform: scale(1); } }
    @keyframes pkSweat { 0%,20% { opacity: 0; transform: translateY(-3px) scale(.5); } 35% { opacity: 1; transform: translateY(0) scale(1); } 100% { opacity: 0; transform: translateY(8px) scale(1); } }
    @keyframes pkSag { 0%,100% { transform: translateY(0) scale(1,1); } 50% { transform: translateY(1.2px) scale(1.02,.97); } }
    @keyframes pkStream { 0% { opacity: 1; transform: scaleY(0); } 35%,80% { opacity: 1; transform: scaleY(1); } 100% { opacity: 0; transform: scaleY(1); } }
    @keyframes pkDrip { 0%,40% { opacity: 0; transform: translateY(0) scale(.8); } 44% { opacity: 1; transform: translateY(0) scale(1); } 100% { opacity: 0; transform: translateY(12px) scale(1); } }
    @keyframes pkQuiver { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-.7px); } 75% { transform: translateX(.7px); } }
    @keyframes pkRage {
      0%,36%,100% { transform: translate(0,0) rotate(0) scale(1); }
      4%  { transform: translate(-1.3px,.5px) rotate(-2deg) scale(1.04); }
      8%  { transform: translate(1.3px,-.5px) rotate(2deg) scale(1.04); }
      12% { transform: translate(-1.3px,.4px) rotate(-2deg) scale(1.04); }
      16% { transform: translate(1.3px,-.4px) rotate(2deg) scale(1.04); }
      20% { transform: translate(-1px,0) rotate(-1.5deg) scale(1.04); }
      24% { transform: translate(1px,0) rotate(1.5deg) scale(1.04); }
      28% { transform: translate(-.8px,0) rotate(-1deg) scale(1.02); }
      32% { transform: translate(.8px,0) rotate(1deg) scale(1.02); }
    }
    @keyframes pkSteam { 0% { opacity: 0; transform: translateY(2px) scale(.4); } 25% { opacity: 1; } 100% { opacity: 0; transform: translateY(-11px) scale(1.25); } }
    @keyframes pkVein { 0%,40%,100% { transform: scale(1); } 10% { transform: scale(1.5); } 20% { transform: scale(1.1); } 30% { transform: scale(1.4); } }
    @keyframes pkTilt { 0%,100% { transform: rotate(0); } 50% { transform: rotate(-4deg); } }
    @keyframes pkLook { 0%,10%,100% { transform: translate(0,0); } 25%,45% { transform: translate(-2px,0); } 60%,80% { transform: translate(2px,-1px); } }
    @keyframes pkBrow { 0%,20%,85%,100% { transform: translateY(0) rotate(0); } 30%,70% { transform: translateY(-2.5px) rotate(-5deg); } }
    @keyframes pkDot { 0%,10% { opacity: 0; transform: scale(.2); } 25% { opacity: 1; transform: scale(1.25); } 32% { opacity: 1; transform: scale(1); } 80% { opacity: 1; transform: scale(1); } 95%,100% { opacity: 0; transform: scale(.6); } }
    @keyframes pkStamp {
      0%   { opacity: 0; transform: scale(1.6) rotate(-14deg); }
      8%   { opacity: 1; transform: scale(.92) rotate(-5deg); }
      13%  { transform: scale(1.06) rotate(-7deg); }
      19%  { transform: scale(1) rotate(-6deg); }
      70%  { transform: scale(1.03) rotate(-5deg); }
      100% { opacity: 1; transform: scale(1) rotate(-6deg); }
    }
    @keyframes pkDraw { 0%,10% { stroke-dashoffset: 1; } 28%,92% { stroke-dashoffset: 0; } 100% { stroke-dashoffset: 1; } }
    @keyframes pkBlink { 0%,90%,100% { transform: scaleY(1); } 94% { transform: scaleY(.1); } }

    /* ============ টপ বারের বাটন ============ */
    .emoji-btn {
      position: relative; background: var(--surface); border-color: var(--ink) !important;
      transition: transform .18s cubic-bezier(.2, 1.5, .4, 1), opacity .25s ease, filter .25s ease, box-shadow .2s ease;
    }
    .emoji-btn.hidden { display: none !important; }
    .emoji-btn:active { transform: scale(.9); }
    .emoji-btn.open { transform: rotate(-8deg) scale(1.08); box-shadow: 2px 2px 0 var(--ink); }
    .emoji-btn.cooldown { opacity: .55; filter: saturate(.35); pointer-events: none; }
    .emoji-btn.pk-in { animation: pkBtnIn .5s cubic-bezier(.2, 1.5, .4, 1); }
    .emoji-btn.sent { animation: pkBtnSent .5s cubic-bezier(.2, 1.5, .4, 1); }
    .emoji-btn .eb-face { display: block; animation: pkWiggle 5s ease-in-out infinite; }
    @keyframes pkBtnIn { 0% { opacity: 0; transform: scale(.3) rotate(-30deg); } 100% { opacity: 1; transform: scale(1) rotate(0); } }
    @keyframes pkBtnSent { 0% { transform: scale(1); } 35% { transform: scale(1.28) rotate(-10deg); } 70% { transform: scale(.94) rotate(4deg); } 100% { transform: scale(1) rotate(0); } }
    @keyframes pkWiggle { 0%,88%,100% { transform: rotate(0); } 91% { transform: rotate(-14deg); } 94% { transform: rotate(12deg); } 97% { transform: rotate(-6deg); } }

    /* ============ Emoji Picker ============ */
    .emoji-picker {
      position: fixed; top: calc(64px + env(safe-area-inset-top)); right: 16px;
      z-index: 45; width: min(304px, calc(100vw - 32px));
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;
      padding: 12px; border-radius: 18px;
      background: var(--surface); border: 2px solid var(--ink);
      box-shadow: 4px 4px 0 var(--ink);
      transform-origin: top right;
      animation: pkPickerPop .28s cubic-bezier(.2, 1.4, .4, 1);
    }
    .emoji-picker.hidden { display: none !important; }
    .emoji-item {
      appearance: none; border: 1.5px solid transparent; background: var(--surface-2);
      padding: 7px 4px 6px; border-radius: 14px; cursor: pointer; color: var(--ink);
      display: grid; justify-items: center; gap: 4px;
      -webkit-tap-highlight-color: transparent;
      transition: transform .16s cubic-bezier(.2, 1.5, .4, 1), border-color .12s ease, background-color .12s ease;
    }
    .emoji-picker:not(.hidden) .emoji-item {
      animation: pkItemIn .42s cubic-bezier(.2, 1.5, .4, 1) backwards;
      animation-delay: calc(var(--i, 0) * 28ms + 50ms);
    }
    .emoji-item svg { width: 36px; height: 36px; display: block; overflow: visible; filter: drop-shadow(0 2px 0 rgba(27, 42, 107, .16)); transition: transform .2s cubic-bezier(.2, 1.5, .4, 1); }
    .emoji-lbl { font: 800 9.5px/1 var(--font-bn, system-ui, sans-serif); letter-spacing: .02em; opacity: .72; }
    .emoji-item:active { transform: scale(.94); border-color: var(--ink); }
    .emoji-item:active svg { transform: scale(1.18); }
    .emoji-item:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; }
    @media (hover: hover) {
      .emoji-item:hover { transform: translateY(-2px); border-color: var(--ink); }
      .emoji-item:hover svg { transform: scale(1.14); }
    }
    @keyframes pkPickerPop { 0% { opacity: 0; transform: scale(.85) translateY(-6px); } 100% { opacity: 1; transform: scale(1) translateY(0); } }
    @keyframes pkItemIn { 0% { opacity: 0; transform: translateY(10px) scale(.5) rotate(-8deg); } 100% { opacity: 1; transform: none; } }

    /* ============ ফ্লোটিং রিঅ্যাকশন ============ */
    .emoji-stage { position: fixed; inset: 0; pointer-events: none; z-index: 50; overflow: hidden; }
    .emoji-float {
      position: absolute; width: 0;
      display: flex; flex-direction: column; align-items: center; gap: 8px;
      animation: pkEmojiFloat 3s cubic-bezier(.25, .6, .35, 1) forwards;
    }
    .ef-svg {
      width: 84px; height: 84px; flex: none;
      filter: drop-shadow(0 10px 16px rgba(27, 42, 107, .3));
      animation: pkPop .85s cubic-bezier(.3, .7, .4, 1) both;
    }
    .ef-svg svg { width: 100%; height: 100%; display: block; overflow: visible; }
    .ef-name {
      font: 700 12px/1 var(--font-bn, system-ui, sans-serif); padding: 5px 11px; border-radius: 999px;
      background: var(--ink); color: var(--bg);
      box-shadow: 0 4px 12px rgba(0, 0, 0, .25), inset 0 0 0 1.5px var(--c, transparent);
      white-space: nowrap; max-width: 140px; overflow: hidden; text-overflow: ellipsis;
      animation: pkName .45s cubic-bezier(.2, 1.4, .4, 1) .22s both;
    }
    .ef-glow, .ef-ring, .ef-fx { position: absolute; left: 0; top: 42px; pointer-events: none; }
    .ef-glow {
      width: 180px; height: 180px; margin: -90px 0 0 -90px; border-radius: 50%;
      background: radial-gradient(circle, var(--c) 0%, transparent 68%);
      opacity: 0; animation: pkGlow 1.3s ease-out both;
    }
    .ef-ring {
      width: 84px; height: 84px; margin: -42px 0 0 -42px; border-radius: 50%;
      border: 3px solid var(--c); opacity: 0;
      animation: pkRing .95s cubic-bezier(.15, .7, .3, 1) both;
    }
    .ef-ring2 { border-width: 2px; animation-delay: .18s; }
    .ef-fx { width: 0; height: 0; }
    .ef-p {
      position: absolute; left: 0; top: 0; opacity: 0;
      width: var(--s, 16px); height: var(--s, 16px);
      margin: calc(var(--s, 16px) / -2) 0 0 calc(var(--s, 16px) / -2);
      animation: pkParticle var(--dur, 1.4s) cubic-bezier(.15, .7, .3, 1) var(--dl, 0s) both;
    }
    .ef-p svg { width: 100%; height: 100%; display: block; overflow: visible; }

    @keyframes pkEmojiFloat {
      0%   { opacity: 0; transform: translateY(16px); }
      8%   { opacity: 1; transform: translateY(0); }
      68%  { opacity: 1; transform: translateY(-22px); }
      100% { opacity: 0; transform: translateY(-64px); }
    }
    @keyframes pkPop {
      0%   { transform: scale(.2) rotate(-14deg); }
      35%  { transform: scale(1.25) rotate(6deg); }
      55%  { transform: scale(.93) rotate(-3deg); }
      75%  { transform: scale(1.04) rotate(1deg); }
      100% { transform: scale(1) rotate(0); }
    }
    @keyframes pkName { 0% { opacity: 0; transform: translateY(8px) scale(.8); } 100% { opacity: 1; transform: translateY(0) scale(1); } }
    @keyframes pkRing { 0% { opacity: .9; transform: scale(.35); } 100% { opacity: 0; transform: scale(2.3); } }
    @keyframes pkGlow { 0% { opacity: 0; transform: scale(.4); } 25% { opacity: .5; } 100% { opacity: 0; transform: scale(1.8); } }
    @keyframes pkParticle {
      0%   { opacity: 0; transform: translate(0,0) scale(.1) rotate(0deg); }
      12%  { opacity: 1; transform: translate(calc(var(--dx) * .25), calc(var(--dy) * .25)) scale(1.15) rotate(calc(var(--rot) * .2)); }
      100% { opacity: 0; transform: translate(var(--dx), var(--dy)) scale(.7) rotate(var(--rot)); }
    }
    @keyframes pkEmojiFade { 0% { opacity: 0; } 10%,80% { opacity: 1; } 100% { opacity: 0; } }

    /* ============ মোশন কম পছন্দ করলে ============ */
    @media (prefers-reduced-motion: reduce) {
      .pk-a, .ef-svg, .ef-name, .emoji-btn, .emoji-btn .eb-face,
      .emoji-picker, .emoji-picker .emoji-item { animation: none !important; }
      .ef-p, .ef-ring, .ef-glow { display: none !important; }
      .emoji-float { animation: pkEmojiFade 2.4s linear forwards !important; }
      .pk-draw { stroke-dashoffset: 0; }
    }
  `;
  document.head.appendChild(style);

  // টপ বারে কাস্টম Emoji বাটন যোগ করা
  const topActions = document.querySelector(".top-actions");
  const themeBtn = document.getElementById("btn-theme");
  if (topActions && themeBtn) {
    const btn = document.createElement("button");
    btn.id = "btn-emoji";
    btn.className = "icon-btn emoji-btn hidden";
    btn.type = "button";
    btn.setAttribute("aria-label", "Send emoji reaction");
    btn.setAttribute("aria-haspopup", "menu");
    btn.setAttribute("aria-expanded", "false");
    btn.title = "Send Reaction";
    btn.innerHTML = BTN_SVG;
    btn.onclick = (e) => {
      e.stopPropagation();
      togglePicker();
    };
    topActions.insertBefore(btn, themeBtn);
  }

  // কাস্টম Emoji Picker তৈরি করা
  const picker = document.createElement("div");
  picker.id = "emoji-picker";
  picker.className = "emoji-picker hidden";
  picker.setAttribute("role", "menu");

  Object.entries(CUSTOM_EMOJIS).forEach(([key, itemData], idx) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "emoji-item";
    item.setAttribute("role", "menuitem");
    item.title = itemData.label;
    item.setAttribute("aria-label", itemData.label);
    // --i: পপ-ইনের স্টাগার, --ad: প্রতিটি ইমোজির লুপ আলাদা সময়ে শুরু হবে
    item.style.setProperty("--i", idx);
    item.style.setProperty("--ad", `${-(idx * 0.37).toFixed(2)}s`);
    item.innerHTML = `${renderSvg(key)}<span class="emoji-lbl">${itemData.label}</span>`;
    item.onclick = (e) => {
      e.stopPropagation();
      sendEmoji(key);
    };
    picker.appendChild(item);
  });
  document.body.appendChild(picker);

  // Floating Animation Stage
  const stage = document.createElement("div");
  stage.id = "emoji-stage";
  stage.className = "emoji-stage";
  stage.setAttribute("aria-hidden", "true");
  document.body.appendChild(stage);

  document.addEventListener("click", (e) => {
    const p = document.getElementById("emoji-picker");
    const b = document.getElementById("btn-emoji");
    if (p && !p.classList.contains("hidden") && !p.contains(e.target) && !(b && b.contains(e.target))) {
      closePicker();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closePicker();
  });
}

function setPickerOpen(open) {
  const p = document.getElementById("emoji-picker");
  const b = document.getElementById("btn-emoji");
  if (p) p.classList.toggle("hidden", !open);
  if (b) {
    b.classList.toggle("open", open);
    b.setAttribute("aria-expanded", open ? "true" : "false");
  }
}

function togglePicker() {
  const p = document.getElementById("emoji-picker");
  if (p) setPickerOpen(p.classList.contains("hidden"));
}

function closePicker() {
  setPickerOpen(false);
}

// বাটনে এক-শট অ্যানিমেশন চালানো (pk-in / sent)
function playBtn(cls) {
  const btn = document.getElementById("btn-emoji");
  if (!btn) return;
  btn.classList.remove("pk-in", "sent");
  void btn.offsetWidth;
  btn.classList.add(cls);
  setTimeout(() => btn.classList.remove(cls), 600);
}

export function startEmojiRoom(db, roomCode, getInfoFn) {
  stopEmojiRoom();
  currentDb = db;
  currentRoom = roomCode;
  getUserInfo = getInfoFn;

  const btn = document.getElementById("btn-emoji");
  if (btn) {
    btn.classList.remove("hidden");
    playBtn("pk-in");
  }

  let firstSnap = true;
  let lastId = null;

  unsubEmoji = onValue(ref(db, `Rooms/${roomCode}/emoji`), (snap) => {
    const val = snap.val();
    if (firstSnap) {
      firstSnap = false;
      if (val && val.id) lastId = val.id;
      return;
    }
    if (!val || !val.emoji || val.id === lastId) return;
    lastId = val.id;
    spawnFloatingEmoji(val.emoji, val.name);
  });
}

export function stopEmojiRoom() {
  if (unsubEmoji) { unsubEmoji(); unsubEmoji = null; }
  currentRoom = null;
  closePicker();
  const btn = document.getElementById("btn-emoji");
  if (btn) {
    btn.classList.add("hidden");
    btn.classList.remove("cooldown", "open", "sent", "pk-in");
  }
}

async function sendEmoji(emojiKey) {
  closePicker();
  if (!currentDb || !currentRoom || !getUserInfo) return;

  const now = Date.now();
  if (now - lastSentAt < COOLDOWN_MS) return;
  lastSentAt = now;

  const btn = document.getElementById("btn-emoji");
  if (btn) {
    playBtn("sent");
    btn.classList.add("cooldown");
    setTimeout(() => btn.classList.remove("cooldown"), COOLDOWN_MS);
  }

  const info = getUserInfo() || {};
  const id = Math.random().toString(36).slice(2, 9);

  try {
    await set(ref(currentDb, `Rooms/${currentRoom}/emoji`), {
      emoji: emojiKey,
      name: (info.name || "Player").slice(0, 20),
      uid: info.uid || "",
      id,
      ts: serverTimestamp()
    });
  } catch (err) {
    console.warn("Emoji send error:", err);
  }
}

function spawnFloatingEmoji(emojiKey, senderName) {
  const stage = document.getElementById("emoji-stage");
  const data = CUSTOM_EMOJIS[emojiKey];
  if (!stage || !data) return;

  // একসাথে অনেক রিঅ্যাকশন জমে গেলে সবচেয়ে পুরনোটা সরিয়ে দেওয়া
  while (stage.children.length >= MAX_FLOATS) stage.firstElementChild.remove();

  const fx = FX[emojiKey] || { c: "#FFD84D" };
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const wrap = document.createElement("div");
  wrap.className = `emoji-float emo-${emojiKey}`;
  wrap.style.left = `${28 + Math.random() * 44}%`;
  wrap.style.top = `${13 + Math.random() * 14}%`;
  wrap.style.setProperty("--c", fx.c);

  wrap.innerHTML =
    `<div class="ef-glow"></div>` +
    `<div class="ef-ring"></div>` +
    `<div class="ef-ring ef-ring2"></div>` +
    `<div class="ef-fx">${reduce ? "" : buildParticles(emojiKey)}</div>` +
    `<div class="ef-svg">${renderSvg(emojiKey)}</div>`;

  if (senderName) {
    const nameEl = document.createElement("span");
    nameEl.className = "ef-name";
    nameEl.textContent = senderName;
    wrap.appendChild(nameEl);
  }

  stage.appendChild(wrap);
  setTimeout(() => wrap.remove(), 3200);
}
