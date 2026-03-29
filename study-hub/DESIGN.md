# Design System Strategy: Neon Architectural

## 1. Overview & Creative North Star
The Creative North Star for this design system is **"The Luminous Monolith."** 

This system rejects the soft, bubbly aesthetics of modern SaaS in favor of a high-contrast, editorial experience that feels both structural and cinematic. By pairing the rigid, zero-radius geometry of "Architectural Minimalism" with the hyper-saturated energy of "Neon Noir," we create a digital environment that feels like a premium physical space at night. We break the standard "template" look through intentional asymmetry, massive typographic scales, and depth achieved via tonal layering rather than artificial borders.

## 2. Colors
The palette is rooted in deep obsidian tones, punctuated by the high-frequency vibration of magenta and violet accents.

*   **Primary (#ff86c2) & Secondary (#bf81ff):** These are your "light sources." Use them sparingly to guide the eye or for critical interactive elements. They should feel like neon gas trapped in glass.
*   **The "No-Line" Rule:** To maintain a high-end feel, 1px solid borders are strictly prohibited for sectioning. Structural boundaries must be defined solely through background color shifts. For example, a `surface-container-low` (#131318) sidebar sitting against a `background` (#0e0e13) main content area.
*   **Surface Hierarchy & Nesting:** Treat the UI as a series of stacked architectural slabs. Use the `surface-container` tiers (Lowest to Highest) to create depth. An inner module should always be one tier higher or lower than its parent container to signify importance.
*   **The "Glass & Gradient" Rule:** To provide visual "soul," use subtle linear gradients (e.g., `primary` transitioning to `primary-container`) for hero CTAs. Incorporate Glassmorphism for floating overlays by using semi-transparent surface colors with a `20px - 40px` backdrop-blur to soften the transition between light and dark.

## 3. Typography
This system utilizes a high-contrast pairing to balance technical precision with human readability.

*   **Display & Headlines (Space Grotesk):** This is our "Architectural" voice. Its geometric, slightly quirky terminals reflect technical sophistication. Use `display-lg` (3.5rem) with tight letter-spacing (-0.02em) for hero sections to create an editorial, "magazine-cover" impact.
*   **Body & Labels (Manrope):** This is our "Functional" voice. Manrope provides the warmth and legibility needed for long-form data. 
*   **Hierarchy as Identity:** Use extreme scale differences to communicate importance. A `label-sm` (0.6875rem) in all-caps next to a `display-md` (2.75rem) title creates a sophisticated, asymmetrical tension that feels custom-designed.

## 4. Elevation & Depth
Depth in this system is a result of light and shadow physics, not CSS borders.

*   **The Layering Principle:** Stacking `surface-container` tiers is the primary way to achieve lift. A `surface-container-highest` (#25252c) card on a `surface-dim` (#0e0e13) background provides enough natural contrast to define a container without a single line of stroke.
*   **Ambient Shadows:** When an element must "float" (like a dropdown or modal), shadows must be extra-diffused. Use a blur of `40px` or more with an opacity between `4%-8%`. The shadow color should be a tinted version of `on-surface` (a deep violet tint) to mimic ambient light reflecting off dark glass.
*   **The "Ghost Border" Fallback:** If a container requires further definition for accessibility, use a "Ghost Border": the `outline-variant` token at 15% opacity. Full-contrast borders are forbidden.
*   **Hard Edges:** Per the `0px` roundedness scale, every element must remain perfectly rectangular. This reinforces the "Architectural" feel. Softness is achieved through gradients and blurs, not corner radii.

## 5. Components

*   **Buttons:** Rectangular slabs. 
    *   *Primary:* Solid `primary` background with `on-primary` text. No border.
    *   *Secondary:* `surface-container-highest` background with a `primary` Ghost Border.
    *   *States:* Hover states should trigger a subtle glow (outer shadow) using the `primary` color at low opacity.
*   **Input Fields:** Minimalist and structural. Use a `surface-container-low` background with a bottom-only `outline` accent. Error states utilize `error` (#ff6e84) but maintain the 0px radius.
*   **Chips:** Use `secondary-container` for selection. They should look like small, precisely cut tiles.
*   **Cards & Lists:** Use the Spacing Scale (specifically `8` [2.75rem] or `10` [3.5rem]) to separate content blocks. Dividers are replaced by vertical whitespace or a 1-step shift in surface tone.
*   **Tooltips:** Glassmorphic containers using `surface-bright` at 80% opacity with a heavy backdrop blur. This ensures they feel like they are floating "above" the architecture.

## 6. Do's and Don'ts

### Do:
*   **DO** use the `24` (8.5rem) spacing token for hero margins to create "breathing room" typical of high-end editorial layouts.
*   **DO** use `primary` and `secondary` gradients for data visualization or hero backgrounds to mimic the "Neon" light source.
*   **DO** lean into asymmetry. Off-center a headline or stagger card heights to break the "grid" feel.

### Don't:
*   **DON'T** use rounded corners. A single `4px` radius will break the architectural integrity of the entire system.
*   **DON'T** use pure black (#000000) for large surfaces unless it's the `surface-container-lowest`. Use the nuanced `background` (#0e0e13) for depth.
*   **DON'T** use standard grey shadows. Shadows should feel like they are absorbing the purple and magenta light of the environment.
*   **DON'T** use 1px solid borders to separate list items; use tonal shifts or `1.5` (0.5rem) gaps of whitespace.