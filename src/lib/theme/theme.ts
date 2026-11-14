// The site's theme: dark by default, light when the visitor chooses it.
//
// <html> carries the "dark" class. Without it the light palette in globals.css
// applies. The visitor's choice is kept in localStorage["theme"] ("dark" or
// "light"). With no stored choice, dark is used unless the device itself asks
// for light.
export const THEME_KEY = "theme";

// Runs in <head> before the first paint, so there is no flash of the wrong theme.
export const themeInitScript = `(function(){try{var s=localStorage.getItem("${THEME_KEY}");var light=s==="light"||(s!=="dark"&&window.matchMedia("(prefers-color-scheme: light)").matches);var r=document.documentElement;if(light){r.classList.remove("dark")}else{r.classList.add("dark")}}catch(e){}})();`;

export type Theme = "light" | "dark";

export function storedTheme(): Theme | null {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return v === "light" || v === "dark" ? v : null;
  } catch {
    return null;
  }
}
