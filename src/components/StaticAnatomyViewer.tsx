import { useRef, useState } from "react";
import { Activity, Expand, Layers3, Search, RotateCcw, X } from "lucide-react";
import "./StaticAnatomyViewer.css";

export default function StaticAnatomyViewer() {
  const viewerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [showInfo, setShowInfo] = useState(false);

  const resetView = () => {
    setZoom(1);
    setShowInfo(false);
  };

  const zoomIn = () => {
    setZoom((value) => {
      if (value >= 1.35) return 1;
      return Number((value + 0.15).toFixed(2));
    });
  };

  const toggleFullscreen = async () => {
    const node = viewerRef.current;
    if (!node) return;

    if (!document.fullscreenElement) {
      await node.requestFullscreen?.();
    } else {
      await document.exitFullscreen?.();
    }
  };

  return (
    <section className="hw-anatomy-card" ref={viewerRef} aria-label="Anatomical body viewer">
      <div className="hw-anatomy-toolbar" aria-label="Body viewer controls">
        <button
          className="hw-anatomy-tool active"
          type="button"
          onClick={resetView}
          title="Reset body view"
          aria-label="Reset body view"
        >
          <Activity size={24} />
        </button>

        <button
          className="hw-anatomy-tool"
          type="button"
          onClick={zoomIn}
          title="Zoom body"
          aria-label="Zoom body"
        >
          <Search size={24} />
          <span className="hw-zoom-plus">+</span>
        </button>

        <button
          className={`hw-anatomy-tool ${showInfo ? "selected" : ""}`}
          type="button"
          onClick={() => setShowInfo((value) => !value)}
          title="View anatomy information"
          aria-label="View anatomy information"
          aria-pressed={showInfo}
        >
          <Layers3 size={24} />
        </button>

        <button
          className="hw-anatomy-tool"
          type="button"
          onClick={toggleFullscreen}
          title="Fullscreen"
          aria-label="Fullscreen"
        >
          <Expand size={24} />
        </button>
      </div>

      <div className="hw-anatomy-stage">
        {showInfo && (
          <aside className="hw-anatomy-info">
            <button
              type="button"
              onClick={() => setShowInfo(false)}
              aria-label="Close anatomy information"
            >
              <X size={17} />
            </button>
            <strong>Muscular anatomy</strong>
            <span>Static anatomical reference view</span>
            <small>Use zoom for a closer look. The model does not rotate automatically.</small>
          </aside>
        )}

        <div
          className="hw-anatomy-body-wrap"
          style={{ transform: `scale(${zoom})` }}
        >
          <img
            src="/anatomy-body.png"
            alt="Muscular human anatomical model"
            className="hw-anatomy-body"
            draggable={false}
          />
        </div>

        <div className="hw-anatomy-platform" aria-hidden="true" />
      </div>

      <div className="hw-anatomy-status">
        <RotateCcw size={18} />
        <span>Static anatomy view</span>
      </div>
    </section>
  );
}
