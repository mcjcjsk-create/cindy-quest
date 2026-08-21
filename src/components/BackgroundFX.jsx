/**
 * BackgroundFX.jsx
 * Static layered backdrop: deep-space gradients, HUD grid and scanlines.
 * Pure decoration, no logic.
 */
export default function BackgroundFX() {
  return (
    <>
      <div className="grid-overlay" aria-hidden="true" />
      <div className="scanlines" aria-hidden="true" />
    </>
  )
}
