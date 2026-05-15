/**
 * USAGE OBLIGATOIRE — Tout nouvel écran avec un CTA principal en bas DOIT
 * utiliser ce composant. Cela élimine architecturalement le bug récurrent
 * où la BottomNav (LimelightNav) cache le CTA.
 *
 * Anti-pattern interdit :
 *    <div className="fixed bottom-0 ..."><Button>Valider</Button></div>
 *
 * Pattern correct :
 *   <Screen>
 *     <Screen.Header>...</Screen.Header>
 *     <Screen.Content>{scrollable content}</Screen.Content>
 *     <Screen.StickyAction>
 *       <Button>Valider</Button>
 *     </Screen.StickyAction>
 *   </Screen>
 *
 * Ce composant gère automatiquement :
 *  - Le padding-bas selon BottomNav + StickyAction
 *  - L'inset safe-area iPhone (notch + home bar)
 *  - Le gradient de fade entre contenu et CTA
 *  - Le z-index correct (CTA au-dessus du contenu, en-dessous des modals)
 */
import {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
  useId,
} from "react";
import { cn } from "@/lib/utils";

// Hauteur visuelle de la LimelightNav (sans safe-area, gérée séparément)
const BOTTOM_NAV_HEIGHT = 72;
const STICKY_ACTION_MIN_HEIGHT = 88;

interface ScreenContextValue {
  hasBottomNav: boolean;
  registerStickyAction: (id: string) => void;
  unregisterStickyAction: (id: string) => void;
  hasStickyAction: boolean;
}

const ScreenContext = createContext<ScreenContextValue>({
  hasBottomNav: true,
  registerStickyAction: () => {},
  unregisterStickyAction: () => {},
  hasStickyAction: false,
});

interface ScreenProps {
  children: ReactNode;
  hasBottomNav?: boolean;
  className?: string;
}

export function Screen({
  children,
  hasBottomNav = true,
  className,
}: ScreenProps) {
  const [stickyIds, setStickyIds] = useState<Set<string>>(() => new Set());

  const registerStickyAction = (id: string) => {
    setStickyIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const unregisterStickyAction = (id: string) => {
    setStickyIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const ctx: ScreenContextValue = {
    hasBottomNav,
    registerStickyAction,
    unregisterStickyAction,
    hasStickyAction: stickyIds.size > 0,
  };

  return (
    <ScreenContext.Provider value={ctx}>
      <div className={cn("flex flex-col min-h-0", className)}>{children}</div>
    </ScreenContext.Provider>
  );
}

interface ScreenHeaderProps {
  children: ReactNode;
  sticky?: boolean;
  className?: string;
}

Screen.Header = function ScreenHeader({
  children,
  sticky = false,
  className,
}: ScreenHeaderProps) {
  return (
    <div
      className={cn(
        sticky && "sticky top-0 z-30 bg-background/80 backdrop-blur-md",
        className
      )}
    >
      {children}
    </div>
  );
};

interface ScreenContentProps {
  children: ReactNode;
  className?: string;
}

Screen.Content = function ScreenContent({
  children,
  className,
}: ScreenContentProps) {
  const { hasBottomNav, hasStickyAction } = useContext(ScreenContext);

  const bottomPadding =
    (hasBottomNav ? BOTTOM_NAV_HEIGHT : 0) +
    (hasStickyAction ? STICKY_ACTION_MIN_HEIGHT : 0) +
    16;

  return (
    <div
      className={cn("flex-1 min-h-0", className)}
      style={{
        paddingBottom: `calc(${bottomPadding}px + env(safe-area-inset-bottom, 0px))`,
      }}
    >
      {children}
    </div>
  );
};

interface ScreenStickyActionProps {
  children: ReactNode;
  className?: string;
}

Screen.StickyAction = function ScreenStickyAction({
  children,
  className,
}: ScreenStickyActionProps) {
  const id = useId();
  const { hasBottomNav, registerStickyAction, unregisterStickyAction } =
    useContext(ScreenContext);

  useEffect(() => {
    registerStickyAction(id);
    return () => unregisterStickyAction(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Positionné AU-DESSUS de la BottomNav (z-50), donc z-40 + offset bottom
  const bottomOffset = hasBottomNav ? BOTTOM_NAV_HEIGHT : 0;

  return (
    <div
      className="fixed left-0 right-0 z-40 pointer-events-none"
      style={{
        bottom: `calc(${bottomOffset}px + env(safe-area-inset-bottom, 0px))`,
      }}
    >
      {/* Gradient de fade pour adoucir la transition contenu → CTA */}
      <div
        aria-hidden
        className="h-6 bg-gradient-to-t from-background to-transparent pointer-events-none"
      />
      <div
        className={cn(
          "pointer-events-auto bg-background/95 backdrop-blur-lg border-t border-border/60 px-4 py-3",
          className
        )}
      >
        {children}
      </div>
    </div>
  );
};

export default Screen;
