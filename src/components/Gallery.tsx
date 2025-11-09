import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { PanInfo } from "motion";
import { motion } from "motion/react";
import styles from "./Gallery.module.css";

export type GalleryItem = {
  src: string;
  caption: string;
};

type Props = {
  items: GalleryItem[];
};

export default function Gallery({ items }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [scatter, setScatter] = useState<ScatterPoint[]>([]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [bounds, setBounds] = useState<Bounds>({ maxX: 180, maxY: 180 });
  const [magnetized, setMagnetized] = useState(false);

  const ensureActiveInRange = useCallback(() => {
    setActiveIndex((current) => {
      if (items.length === 0) return null;
      if (current === null) return 0;
      if (current >= items.length) return Math.max(0, items.length - 1);
      return current;
    });
  }, [items.length]);

  useEffect(() => {
    ensureActiveInRange();
  }, [ensureActiveInRange]);

  const regenerateScatter = useCallback(
    (width: number, height: number) => {
      const nextBounds = calculateBounds(width, height);
      setBounds(nextBounds);
      setScatter((previous) => {
        if (previous.length === items.length && previous.length > 0) {
          return previous.map((point) => ({
            ...point,
            x: clamp(point.x, -nextBounds.maxX, nextBounds.maxX),
            y: clamp(point.y, -nextBounds.maxY, nextBounds.maxY),
          }));
        }
        return createScatter(nextBounds, items.length);
      });
    },
    [items.length]
  );

  useLayoutEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const stage = stageRef.current;
    if (!stage) return;

    const update = () => {
      const rect = stage.getBoundingClientRect();
      regenerateScatter(rect.width, rect.height);
    };
    update();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (entry?.contentRect) {
          const { width, height } = entry.contentRect;
          regenerateScatter(width, height);
        }
      });
      observer.observe(stage);
      return () => observer.disconnect();
    }

    const onResize = () => update();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [regenerateScatter]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    let timeout: number | undefined;
    const handleScroll = () => {
      setMagnetized(true);
      window.clearTimeout(timeout);
      timeout = window.setTimeout(
        () => setMagnetized(false),
        MAGNET_RELEASE_DELAY
      );
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.clearTimeout(timeout);
    };
  }, []);

  const handleActivate = useCallback((index: number) => {
    setActiveIndex(index);
  }, []);

  const handleDragEnd = useCallback(
    (index: number) => (_: unknown, info: PanInfo) => {
      const offsetX = info.offset.x ?? 0;
      const offsetY = info.offset.y ?? 0;
      const velocityX = info.velocity.x ?? 0;
      const velocityY = info.velocity.y ?? 0;

      setScatter((previous) => {
        const current = previous[index];
        if (!current) return previous;

        const next = [...previous];
        const driftX = clamp(velocityX * 0.08, -FLOAT_DRIFT, FLOAT_DRIFT);
        const driftY = clamp(velocityY * 0.08, -FLOAT_DRIFT, FLOAT_DRIFT);

        next[index] = {
          ...current,
          x: clamp(current.x + offsetX + driftX, -bounds.maxX, bounds.maxX),
          y: clamp(current.y + offsetY + driftY, -bounds.maxY, bounds.maxY),
          rotate:
            magnetized || activeIndex === index
              ? current.rotate
              : randomBetween(-14, 14),
        };
        return next;
      });
    },
    [activeIndex, bounds.maxX, bounds.maxY, magnetized]
  );

  const dragConstraints = useMemo(
    () => ({
      left: -bounds.maxX,
      right: bounds.maxX,
      top: -bounds.maxY,
      bottom: bounds.maxY,
    }),
    [bounds.maxX, bounds.maxY]
  );

  return (
    <div className={styles.container}>
      <div className={styles.stage} ref={stageRef} aria-live="polite">
        {items.map((item, index) => {
          const scatterPoint = scatter[index] ?? { x: 0, y: 0, rotate: 0 };
          const isActive = index === activeIndex;
          const zIndex = isActive ? items.length + 10 : index + 1;

          const animate = magnetized
            ? {
                x: 0,
                y: 0,
                rotate: 0,
                scale: isActive ? ACTIVE_SCALE : MAGNET_SCALE,
              }
            : {
                x: scatterPoint.x,
                y: scatterPoint.y,
                rotate: isActive ? 0 : scatterPoint.rotate,
                scale: isActive ? ACTIVE_SCALE : 1,
              };

          return (
            <motion.button
              key={`${item.src}-${index}`}
              type="button"
              className={styles.cardButton}
              aria-label={item.caption || `Bild ${index + 1}`}
              style={{ zIndex }}
              drag
              dragConstraints={dragConstraints}
              dragElastic={0.12}
              dragMomentum={false}
              whileDrag={{ scale: ACTIVE_SCALE, zIndex: items.length + 20 }}
              onPointerDown={() => handleActivate(index)}
              onClick={() => handleActivate(index)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  handleActivate(index);
                }
              }}
              onDragStart={() => handleActivate(index)}
              onDragEnd={handleDragEnd(index)}
              animate={animate}
              initial={{
                x: scatterPoint.x,
                y: scatterPoint.y,
                rotate: scatterPoint.rotate,
                scale: 1,
              }}
              transition={{
                type: "spring",
                stiffness: 260,
                damping: 30,
              }}
            >
              <article
                className={`${styles.polaroid} ${
                  isActive ? styles.polaroidActive : ""
                }`}
              >
                <img
                  className={styles.image}
                  src={item.src}
                  alt=""
                  loading="lazy"
                />
                <p className={styles.caption}>{item.caption}</p>
              </article>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

type ScatterPoint = {
  x: number;
  y: number;
  rotate: number;
};

type Bounds = {
  maxX: number;
  maxY: number;
};

const randomBetween = (min: number, max: number) =>
  Math.random() * (max - min) + min;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const calculateBounds = (width: number, height: number): Bounds => {
  const effectiveWidth = Math.max(width, 360);
  const effectiveHeight = Math.max(height, 320);
  return {
    maxX: Math.max(110, effectiveWidth * 0.38),
    maxY: Math.max(120, effectiveHeight * 0.46),
  };
};

const createScatter = (bounds: Bounds, count: number) =>
  Array.from({ length: count }, () => ({
    x: randomBetween(-bounds.maxX, bounds.maxX),
    y: randomBetween(-bounds.maxY, bounds.maxY),
    rotate: randomBetween(-18, 18),
  }));

const FLOAT_DRIFT = 60;
const ACTIVE_SCALE = 1.7;
const MAGNET_SCALE = 1.08;
const MAGNET_RELEASE_DELAY = 320;
