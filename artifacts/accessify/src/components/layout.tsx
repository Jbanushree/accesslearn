import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useTheme } from "@/lib/theme-provider";
import { useAccessibility } from "@/lib/accessibility-provider";
import { Moon, Sun, Monitor, Settings, Type, Contrast, Orbit, BookOpen, LayoutDashboard, Library, Upload, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <ToggleGroup type="single" value={theme} onValueChange={(val) => val && setTheme(val as any)} size="sm">
      <ToggleGroupItem value="light" aria-label="Light theme">
        <Sun className="h-4 w-4" />
      </ToggleGroupItem>
      <ToggleGroupItem value="dark" aria-label="Dark theme">
        <Moon className="h-4 w-4" />
      </ToggleGroupItem>
      <ToggleGroupItem value="system" aria-label="System theme">
        <Monitor className="h-4 w-4" />
      </ToggleGroupItem>
    </ToggleGroup>
  );
}

function AccessibilitySettings() {
  const { state, updateState } = useAccessibility();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" title="Accessibility Settings">
          <Settings className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">Accessibility</h4>
            <p className="text-sm text-muted-foreground">Customize your reading experience.</p>
          </div>
          <div className="grid gap-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="font-size" className="flex items-center gap-2">
                  <Type className="h-4 w-4" />
                  Font Size ({state.fontSize}%)
                </Label>
              </div>
              <Slider
                id="font-size"
                max={200}
                min={75}
                step={5}
                value={[state.fontSize]}
                onValueChange={(vals) => updateState({ fontSize: vals[0] })}
              />
            </div>
            
            <div className="flex items-center justify-between space-x-2">
              <Label htmlFor="high-contrast" className="flex flex-col space-y-1">
                <span className="flex items-center gap-2">
                  <Contrast className="h-4 w-4" />
                  High Contrast
                </span>
                <span className="font-normal text-xs text-muted-foreground">Increase color saturation and contrast</span>
              </Label>
              <Switch
                id="high-contrast"
                checked={state.highContrast}
                onCheckedChange={(val) => updateState({ highContrast: val })}
              />
            </div>

            <div className="flex items-center justify-between space-x-2">
              <Label htmlFor="reduce-motion" className="flex flex-col space-y-1">
                <span className="flex items-center gap-2">
                  <Orbit className="h-4 w-4" />
                  Reduce Motion
                </span>
                <span className="font-normal text-xs text-muted-foreground">Minimize animations and transitions</span>
              </Label>
              <Switch
                id="reduce-motion"
                checked={state.reduceMotion}
                onCheckedChange={(val) => updateState({ reduceMotion: val })}
              />
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function NavLinks({ isMobile, onClick }: { isMobile?: boolean, onClick?: () => void }) {
  const [location] = useLocation();
  const links = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/library", label: "Library", icon: Library },
    { href: "/upload", label: "Upload", icon: Upload },
  ];

  return (
    <nav className={`flex ${isMobile ? "flex-col gap-4 mt-6" : "items-center gap-6"}`}>
      {links.map((link) => {
        const Icon = link.icon;
        const isActive = location === link.href || (link.href !== "/" && location.startsWith(link.href));
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onClick}
            className={`flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary ${
              isActive ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [facultyMode, setFacultyMode] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors duration-300">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4 md:px-8 max-w-7xl mx-auto">
          <div className="flex items-center gap-6">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle Menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="pr-0">
                <Link href="/" className="flex items-center gap-2 font-bold font-serif text-xl text-primary">
                  <BookOpen className="h-6 w-6" />
                  Accessify
                </Link>
                <NavLinks isMobile />
              </SheetContent>
            </Sheet>
            <Link href="/" className="hidden md:flex items-center gap-2 font-bold font-serif text-xl text-primary">
              <BookOpen className="h-6 w-6" />
              Accessify
            </Link>
            <div className="hidden md:block">
              <NavLinks />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center space-x-2 mr-4">
              <Label htmlFor="mode-toggle" className="text-xs font-medium cursor-pointer">
                Student
              </Label>
              <Switch
                id="mode-toggle"
                checked={facultyMode}
                onCheckedChange={setFacultyMode}
              />
              <Label htmlFor="mode-toggle" className="text-xs font-medium cursor-pointer text-primary">
                Faculty
              </Label>
            </div>
            
            <ThemeToggle />
            <AccessibilitySettings />
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center">
        <div className="w-full max-w-7xl px-4 md:px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
