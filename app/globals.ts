import { createGlobalStyle } from "styled-components";

const GlobalStyle = createGlobalStyle`
  :root {
    color-scheme: light;
    --ink: #181818;
    --muted: #6f6f6f;
    --line: #e8e6e2;
    --paper: #faf9f6;
    --white: #ffffff;
    --accent: #252525;
    --soft: #f0eee9;
  }
  * { box-sizing: border-box; }
  html { scroll-behavior: smooth; }
  body {
    margin: 0;
    background: var(--paper);
    color: var(--ink);
    font-family: Arial, Helvetica, sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  button, input, select { font: inherit; }
  button, a { -webkit-tap-highlight-color: transparent; }
  a { color: inherit; text-decoration: none; }
  button { cursor: pointer; }
  img { max-width: 100%; display: block; }
  ::selection { background: #dedbd4; }
`;

export default GlobalStyle;
