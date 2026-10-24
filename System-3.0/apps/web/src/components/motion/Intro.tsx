"use client";
import { IntroArtwork } from "./IntroArtwork";
import { useIntroViewModel } from "./useIntroViewModel";
export function Intro() {
  const vm = useIntroViewModel();
  return (
    <div
      id="ff-intro"
      className="ff-intro"
      role="dialog"
      aria-modal="true"
      aria-label="Abertura da Fine Form"
      hidden
    >
      <IntroArtwork />
      <button
        className="intro-skip"
        type="button"
        data-intro-skip
        onClick={vm.skip}
      >
        Pular abertura <span aria-hidden="true">↗</span>
      </button>
    </div>
  );
}
