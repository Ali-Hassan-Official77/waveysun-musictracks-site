import "./globals.css";

export const metadata = {
  title: "WaveySun — Premium Music Streaming",
  description:
    "WaveySun is a premium music discovery and streaming experience powered by the Audius catalog.",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#060b14",
};

// Applies the saved theme before paint so there is no light/dark flash.
const themeScript = `
(function () {
  try {
    var saved = window.localStorage.getItem("waveysun-theme");
    var theme = saved === "light" || saved === "dark" ? saved : "dark";
    document.documentElement.setAttribute("data-theme", theme);
  } catch (e) {
    document.documentElement.setAttribute("data-theme", "dark");
  }
})();
`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="dark">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
