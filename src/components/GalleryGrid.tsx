import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./GalleryGrid.module.css";

type GalleryItem = {
  sectionId: string;
  sectionTitle: string;
  label: string;
  thumbSrc: string;
  thumbWidth: number;
  thumbHeight: number;
  fullSrc: string;
};

type GallerySection = {
  id: string;
  title: string;
  items: GalleryItem[];
};

type Props = {
  sections: GallerySection[];
};

export default function GalleryGrid({ sections }: Props) {
  const [active, setActive] = useState<GalleryItem | null>(null);
  const portalContainer = useMemo(() => {
    if (typeof document === "undefined") {
      return null;
    }
    const container = document.createElement("div");
    container.setAttribute("data-gallery-overlay", "");
    document.body.appendChild(container);
    return container;
  }, []);

  useEffect(() => {
    return () => {
      if (portalContainer) {
        document.body.removeChild(portalContainer);
      }
    };
  }, [portalContainer]);

  const close = useCallback(() => {
    setActive(null);
  }, []);

  useEffect(() => {
    if (!active) {
      return;
    }

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [active, close]);

  useEffect(() => {
    if (!active) {
      return;
    }

    const { body } = document;
    const previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";
    return () => {
      body.style.overflow = previousOverflow;
    };
  }, [active]);

  return (
    <>
      <div className={styles.container}>
        {sections.map((section) => (
          <article
            key={section.id}
            id={`gallery-${section.id}`}
            className={styles.gallerySection}
          >
            <header className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>{section.title}</h3>
            </header>
            <div className={styles.grid} role="list">
              {section.items.map((item) => (
                <button
                  key={`${item.sectionId}-${item.label}`}
                  className={styles.card}
                  type="button"
                  role="listitem"
                  onClick={() => setActive(item)}
                  aria-label={`${section.title}: ${item.label}`}
                >
                  <img
                    className={styles.thumbnail}
                    src={item.thumbSrc}
                    width={item.thumbWidth}
                    height={item.thumbHeight}
                    alt={`${section.title} ${item.label}`}
                    loading="lazy"
                    decoding="async"
                  />
                </button>
              ))}
            </div>
          </article>
        ))}
      </div>
      {active &&
        portalContainer &&
        createPortal(
          <div
            className={styles.overlay}
            role="dialog"
            aria-modal="true"
            aria-label={`${active.sectionTitle} ${active.label}`}
            onClick={close}
          >
            <div
              className={styles.dialog}
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                className={styles.closeButton}
                onClick={close}
              >
                <span aria-hidden="true">×</span>
                <span className={styles.srOnly}>Close</span>
              </button>
              <img
                className={styles.fullImage}
                src={active.fullSrc}
                alt={`${active.sectionTitle} ${active.label}`}
                loading="eager"
                decoding="async"
              />
            </div>
          </div>,
          portalContainer
        )}
    </>
  );
}
