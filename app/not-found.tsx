import styled from "styled-components";
const Wrap = styled.main`min-height:70vh;display:grid;place-items:center;padding:24px;text-align:center;`;
export default function NotFound() {
  return <Wrap><div><p style={{letterSpacing:".18em",fontSize:11}}>404 — NOT FOUND</p><h1 style={{fontSize:"clamp(40px,8vw,80px)",letterSpacing:"-.07em",fontWeight:500}}>Nothing here.</h1><a href="/" style={{textDecoration:"underline",fontSize:13}}>Return to the collection</a></div></Wrap>;
}
