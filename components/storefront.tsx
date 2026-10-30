"use client";

import { useEffect, useMemo, useState } from "react";
import styled, { createGlobalStyle, keyframes } from "styled-components";
import type { PrintifyOption, StoreProduct, StoreVariant } from "@/lib/types";

/* Hero artwork lives in /public/hero-sasha.png */
const HERO_IMAGE = "/hero-sasha.png";

const HERO_POSITION_DESKTOP = "center 10%";
const HERO_POSITION_MOBILE = "90% 20%";
const MARQUEE_WORDS = ["Self first", "Money next", "Traps avoided", "On God"];

const GOLD = "#c9a45c";
const INK = "#0c0c0c";
const LINE = "#e3e1dc";
const SURFACE = "#f3f2ef";

const Global = createGlobalStyle`
  @import url("https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=DM+Sans:wght@400;500;600&display=swap");
  html{scroll-behavior:smooth;}
  body{margin:0;font-family:"DM Sans",system-ui,sans-serif;-webkit-font-smoothing:antialiased;}
  button{font-family:inherit;cursor:pointer;}
  a{color:inherit;text-decoration:none;}
  :focus-visible{outline:2px solid ${GOLD};outline-offset:3px;}
`;

const display = `font-family:"Bricolage Grotesque","DM Sans",system-ui,sans-serif;`;

const Page = styled.main`min-height:100vh;background:${SURFACE};color:${INK};`;

/* ---------- Scrolling words ---------- */
const scroll = keyframes`from{transform:translateX(0);}to{transform:translateX(-50%);}`;

const MarqueeBar = styled.div`
  background:${INK};color:#fff;overflow:hidden;white-space:nowrap;padding:14px 0;
  border-bottom:1px solid #ffffff1f;
  @media(max-width:600px){padding:10px 0;}
  &:hover > div{animation-play-state:paused;}
`;
const MarqueeTrack = styled.div`
  display:inline-flex;width:max-content;animation:${scroll} 28s linear infinite;
  @media(max-width:600px){animation-duration:20s;}
  @media(prefers-reduced-motion:reduce){animation:none;}
`;
const MarqueeItem = styled.span`
  ${display}
  display:inline-flex;align-items:center;font-size:clamp(16px,2.4vw,28px);font-weight:800;
  letter-spacing:-.03em;padding-right:24px;
  &::after{content:"✦";color:${GOLD};font-size:.6em;margin-left:24px;}
`;

/* ---------- Header ---------- */
const Header = styled.header`
  height:72px;padding:0 clamp(14px,4vw,56px);display:grid;grid-template-columns:1fr auto 1fr;
  align-items:center;gap:12px;background:#fffffff2;backdrop-filter:blur(10px);
  border-bottom:1px solid ${LINE};position:sticky;top:0;z-index:5;
  @media(max-width:600px){height:60px;grid-template-columns:auto 1fr auto;}
`;
const Wordmark = styled.a`
  ${display}font-weight:800;font-size:18px;letter-spacing:-.04em;white-space:nowrap;
  @media(max-width:600px){font-size:15px;}
`;
const Nav = styled.nav`
  display:flex;gap:clamp(16px,3vw,36px);font-size:13px;font-weight:500;
  a{padding:6px 0;border-bottom:1px solid transparent;transition:border-color .2s;}
  a:hover{border-color:${INK};}
  @media(max-width:600px){gap:14px;font-size:12px;justify-content:center;}
  @media(max-width:400px){a[href="#about"]{display:none;}}
`;
const HeaderRight = styled.div`display:flex;justify-content:flex-end;`;
const CartButton = styled.button`
  border:0;background:${INK};color:#fff;padding:11px 18px;font-size:12px;font-weight:600;
  border-radius:999px;white-space:nowrap;transition:background .2s;
  @media(max-width:600px){padding:10px 14px;}
  &:hover{background:#333;}
`;

/* ---------- Hero ---------- */
const Hero = styled.section`
  position:relative;min-height:clamp(560px,88vh,860px);background:#000;color:#fff;
  @supports(height:1svh){min-height:clamp(560px,88svh,860px);}
  @media(max-width:700px){min-height:max(560px,82svh);}
  display:flex;align-items:flex-end;overflow:hidden;isolation:isolate;
`;
const HeroImage = styled.img`
  position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:${HERO_POSITION_DESKTOP};z-index:-2;
  @media(max-width:700px){object-position:${HERO_POSITION_MOBILE};}
`;
const HeroShade = styled.div`
  position:absolute;inset:0;z-index:-1;
  background:
    linear-gradient(180deg,#0000004d 0%,#0000 30%,#000000e6 100%),
    linear-gradient(90deg,#000000b3 0%,#0000 65%);
  @media(max-width:700px){
    /* phones: keep the character clear, darken only the lower half for the text */
    background:linear-gradient(180deg,#00000066 0%,#0000 25%,#0000 45%,#000000f2 100%);
  }
`;
const HeroInner = styled.div`
  width:100%;padding:0 clamp(18px,5vw,72px) clamp(36px,6vw,72px);
  display:flex;justify-content:space-between;align-items:flex-end;gap:32px;flex-wrap:wrap;
  @media(max-width:700px){flex-direction:column;align-items:stretch;gap:20px;padding-top:200px;}
`;
const HeroTitle = styled.h1`
  ${display}
  font-size:clamp(42px,9vw,128px);line-height:.92;letter-spacing:-.05em;font-weight:800;
  margin:0;max-width:900px;
`;
const HeroSide = styled.div`display:grid;gap:22px;max-width:340px;justify-items:start;
  @media(max-width:700px){max-width:none;gap:18px;justify-items:stretch;}
`;
const HeroCopy = styled.p`font-size:15px;line-height:1.65;color:#ffffffcc;margin:0;`;
const HeroCta = styled.a`
  display:inline-block;background:#fff;color:${INK};padding:16px 28px;font-size:14px;font-weight:600;
  border-radius:999px;transition:background .2s,transform .2s;
  &:hover{background:${GOLD};}
  @media(max-width:700px){text-align:center;}
`;

/* ---------- Collection ---------- */
const CollectionHead = styled.div`
  padding:clamp(40px,6vw,72px) clamp(18px,4vw,56px) 24px;display:flex;
  justify-content:space-between;align-items:flex-end;gap:8px 16px;flex-wrap:wrap;
  @media(max-width:600px){padding-top:36px;padding-bottom:18px;}
`;
const SectionTitle = styled.h2`${display}font-size:clamp(26px,4vw,44px);letter-spacing:-.04em;font-weight:800;margin:0;`;
const Count = styled.span`font-size:13px;color:#6d6d6d;`;

const Grid = styled.section`
  padding:0 clamp(18px,4vw,56px) clamp(40px,6vw,80px);
  display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:clamp(18px,2.4vw,32px) clamp(12px,2vw,24px);
  @media(max-width:1050px){grid-template-columns:repeat(3,minmax(0,1fr));}
  @media(max-width:760px){grid-template-columns:repeat(2,minmax(0,1fr));gap:28px 12px;}
  @media(max-width:360px){grid-template-columns:minmax(0,1fr);}
`;
const ProductCard = styled.article`min-width:0;display:flex;flex-direction:column;`;
const ImageBox = styled.div`
  aspect-ratio:4/5;background:#e9e7e2;overflow:hidden;position:relative;border-radius:16px;
  img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .5s ease;}
  &:hover img{transform:scale(1.04);}
  @media(prefers-reduced-motion:reduce){img{transition:none;}&:hover img{transform:none;}}
`;
const ImageCount = styled.span`
  position:absolute;left:10px;bottom:10px;background:#ffffffe6;padding:6px 10px;border-radius:999px;
  font-size:11px;font-weight:500;
`;
const ProductMeta = styled.div`
  display:flex;justify-content:space-between;gap:10px;padding-top:14px;align-items:start;
  @media(max-width:760px){flex-direction:column;gap:4px;padding-top:10px;}
`;
const ProductName = styled.h3`overflow-wrap:anywhere;font-size:14px;font-weight:600;line-height:1.35;margin:0 0 4px;`;
const ProductSub = styled.p`font-size:12px;color:#6d6d6d;margin:0;line-height:1.5;`;
const Price = styled.p`font-size:14px;white-space:nowrap;margin:0;font-weight:600;`;
const Options = styled.div`display:grid;gap:8px;margin-top:12px;`;
const Select = styled.select`
  width:100%;min-width:0;border:1px solid ${LINE};background:#fff;color:#222;
  padding:10px 12px;font:inherit;font-size:13px;border-radius:10px;
  @media(max-width:760px){font-size:16px;padding:11px 10px;} /* 16px stops iOS zooming on focus */
`;
const OptionLabel = styled.p`margin:0;font-size:12px;color:#6d6d6d;strong{color:${INK};font-weight:600;}`;
const Swatches = styled.div`display:flex;flex-wrap:wrap;gap:10px;margin-top:8px;`;
const Swatch = styled.button<{ $bg: string; $active: boolean }>`
  width:28px;height:28px;border-radius:50%;padding:0;background:${(p) => p.$bg};
  border:2px solid ${SURFACE};box-shadow:${(p) => (p.$active ? `0 0 0 2px ${INK}` : "0 0 0 1px #c9c9c9")};
  transition:box-shadow .15s ease,transform .15s ease;
  &:hover{transform:scale(1.08);}
  @media(max-width:760px){width:32px;height:32px;}
  @media(prefers-reduced-motion:reduce){transition:none;&:hover{transform:none;}}
`;
const AddButton = styled.button`
  width:100%;border:1px solid ${INK};background:transparent;color:${INK};padding:12px 10px;
  font-size:13px;font-weight:600;border-radius:999px;margin-top:12px;transition:background .2s,color .2s;
  min-height:44px;
  &:hover:not(:disabled){background:${INK};color:#fff;}
  &:disabled{opacity:.4;cursor:not-allowed;}
`;

const Status = styled.div`padding:44px 20px;text-align:center;color:#6d6d6d;font-size:14px;line-height:1.7;`;

/* ---------- About + footer ---------- */
const About = styled.section`
  background:${INK};color:#fff;padding:clamp(48px,9vw,120px) clamp(18px,5vw,72px);
`;
const AboutTitle = styled.h2`
  ${display}
  font-size:clamp(30px,6vw,76px);font-weight:800;overflow-wrap:anywhere;letter-spacing:-.05em;line-height:.98;margin:0 0 24px;max-width:860px;
`;
const AboutCopy = styled.p`max-width:520px;color:#ffffffb3;font-size:15px;line-height:1.8;margin:0;`;
const Footer = styled.footer`
  background:${INK};color:#ffffff99;border-top:1px solid #ffffff1f;
  padding:28px clamp(18px,5vw,72px);display:flex;justify-content:space-between;gap:20px;font-size:12px;
  @media(max-width:560px){flex-direction:column;gap:10px;padding-bottom:max(28px,env(safe-area-inset-bottom));}
`;

/* ---------- Cart drawer ---------- */
const Overlay = styled.div`position:fixed;inset:0;background:#0009;z-index:10;display:flex;justify-content:flex-end;`;
const Drawer = styled.aside`
  background:#fff;width:min(460px,100%);height:100%;padding:24px;overflow:auto;box-sizing:border-box;
  @supports(height:1dvh){height:100dvh;}
  @media(max-width:480px){padding:18px;}
`;
const DrawerHead = styled.div`display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid ${LINE};padding-bottom:18px;`;
const Close = styled.button`border:0;background:transparent;font-size:28px;line-height:1;`;
const CartLine = styled.div`padding:18px 0;border-bottom:1px solid ${LINE};display:grid;grid-template-columns:64px minmax(0,1fr) auto;gap:14px;align-items:start;
  @media(max-width:400px){grid-template-columns:52px minmax(0,1fr) auto;gap:10px;}
`;
const CartThumb = styled.div`width:64px;aspect-ratio:4/5;background:#e9e7e2;border-radius:10px;overflow:hidden;img{width:100%;height:100%;object-fit:cover;}`;
const SmallButton = styled.button`border:1px solid #ddd;background:#fff;width:32px;height:32px;border-radius:50%;font-size:16px;`;
const PrimaryButton = styled.button`
  width:100%;border:0;background:${INK};color:#fff;padding:16px 18px;border-radius:999px;
  font-size:14px;font-weight:600;margin-top:18px;transition:background .2s;
  &:hover{background:#333;}
`;
const Empty = styled.div`padding:36px 0;color:#6d6d6d;font-size:14px;line-height:1.7;`;

const CheckoutForm = styled.div`display:grid;gap:12px;margin-top:22px;`;
const FormTitle = styled.h3`${display}font-size:20px;margin:0;letter-spacing:-.03em;`;
const FormGrid = styled.div`display:grid;grid-template-columns:1fr 1fr;gap:12px;@media(max-width:420px){grid-template-columns:1fr;}`;
const Field = styled.label`display:grid;gap:6px;font-size:12px;color:#555;min-width:0;`;
const FieldInput = styled.input`width:100%;box-sizing:border-box;border:1px solid ${LINE};background:#fff;color:${INK};padding:12px;border-radius:10px;font:inherit;font-size:14px;min-width:0;`;
const FieldSelect = styled.select`width:100%;box-sizing:border-box;border:1px solid ${LINE};background:#fff;color:${INK};padding:12px;border-radius:10px;font:inherit;font-size:14px;min-width:0;`;
const DeliveryOption = styled.label`display:flex;gap:10px;align-items:flex-start;border:1px solid ${LINE};padding:12px;border-radius:10px;font-size:13px;cursor:pointer;&:has(input:checked){border-color:${INK};background:#f8f7f4;}`;
const SecondaryButton = styled.button`width:100%;border:1px solid ${INK};background:#fff;color:${INK};padding:13px 16px;border-radius:999px;font-size:13px;font-weight:600;margin-top:14px;&:disabled{opacity:.5;cursor:wait;}`;


type CartItem = { product: StoreProduct; variant: StoreVariant; quantity: number };

type ShippingAddress = {
  fullName: string; email: string; phone: string; country: string;
  address1: string; address2: string; city: string; region: string; zip: string;
};
type ShippingRate = { id: string; label: string; amountCents: number };
const EMPTY_ADDRESS: ShippingAddress = {
  fullName: "", email: "", phone: "", country: "US", address1: "", address2: "", city: "", region: "", zip: "",
};

function money(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function sellableVariants(product: StoreProduct) {
  return product.variants.filter((variant) =>
    variant.enabled && variant.available && variant.retailPriceCents > 0
  );
}

function defaultVariant(product: StoreProduct) {
  const variants = sellableVariants(product);
  return variants.find((variant) => variant.isDefault) ?? variants[0] ?? null;
}

function variantLabel(variant: StoreVariant) {
  const labels = Object.values(variant.optionValues);
  return labels.length ? labels.join(" / ") : variant.title;
}

/* Prefer a Printify mockup linked to the chosen variant, then fall back to the product's main image. */
function selectedImage(product: StoreProduct, variant: StoreVariant | null) {
  if (!variant) return product.image ?? product.images[0]?.src ?? null;
  const matching = product.images.filter((image) => image.src && image.variant_ids?.includes(variant.id));
  return (
    matching.find((image) => image.is_default)?.src ??
    matching[0]?.src ??
    product.image ??
    product.images[0]?.src ??
    null
  );
}

function isColorOption(option: PrintifyOption) {
  return /colou?r/i.test(option.name) || option.type === "color";
}

/* CSS background for a swatch, or null when Printify gave no colour for this value. */
function swatchBackground(option: PrintifyOption, valueTitle: string) {
  const colors = option.values?.find((value) => value.title === valueTitle)?.colors?.filter(Boolean) ?? [];
  if (colors.length === 0) return null;
  if (colors.length === 1) return colors[0];
  return `linear-gradient(135deg, ${colors[0]} 50%, ${colors[1]} 50%)`; /* two-tone products */
}

export default function Storefront({
  initialProducts,
  loadError,
}: {
  initialProducts: StoreProduct[];
  loadError?: boolean;
}) {
  const [products] = useState(initialProducts);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, number>>(
    () => Object.fromEntries(
      initialProducts.map((product) => {
        const variant = defaultVariant(product);
        return [product.id, variant?.id ?? -1];
      }),
    ),
  );
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>(EMPTY_ADDRESS);
  const [shippingRates, setShippingRates] = useState<ShippingRate[]>([]);
  const [quotedSubtotalCents, setQuotedSubtotalCents] = useState<number | null>(null);
  const [shippingMethod, setShippingMethod] = useState("");
  const [quotingShipping, setQuotingShipping] = useState(false);
  const [shippingError, setShippingError] = useState("");

  /* If the buyer comes back from Bachs with the browser's back button, unlock the button */
  useEffect(() => {
    const reset = (event: PageTransitionEvent) => { if (event.persisted) setCheckingOut(false); };
    window.addEventListener("pageshow", reset);
    return () => window.removeEventListener("pageshow", reset);
  }, []);

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.variant.retailPriceCents * item.quantity, 0),
    [cart],
  );

  function chosenVariant(product: StoreProduct) {
    return sellableVariants(product).find((variant) => variant.id === selectedVariants[product.id])
      ?? defaultVariant(product);
  }

  function optionNames(product: StoreProduct) {
    return product.options.map((option) => option.name).filter((name) =>
      sellableVariants(product).some((variant) => variant.optionValues[name])
    );
  }

  function chooseOption(product: StoreProduct, optionName: string, value: string) {
    const current = chosenVariant(product);
    const available = sellableVariants(product);
    const matching = available.find((variant) =>
      variant.optionValues[optionName] === value &&
      optionNames(product).every((name) =>
        name === optionName || !current?.optionValues[name] ||
        variant.optionValues[name] === current.optionValues[name]
      )
    ) ?? available.find((variant) => variant.optionValues[optionName] === value);

    if (matching) {
      setSelectedVariants((previous) => ({ ...previous, [product.id]: matching.id }));
    }
  }

  function addToCart(product: StoreProduct) {
    setShippingRates([]);
    setQuotedSubtotalCents(null);
    setShippingMethod("");
    const variant = chosenVariant(product);
    if (!variant) {
      setNotice(`No priced, enabled variant is available for ${product.title}.`);
      return;
    }

    setCart((current) => {
      const found = current.find((item) => item.product.id === product.id && item.variant.id === variant.id);
      if (found) {
        return current.map((item) =>
          item === found ? { ...item, quantity: Math.min(item.quantity + 1, 10) } : item
        );
      }
      return [...current, { product, variant, quantity: 1 }];
    });
    setNotice("");
    setCartOpen(true);
  }

  function updateAddress(field: keyof ShippingAddress, value: string) {
    setShippingAddress((previous) => ({ ...previous, [field]: value }));
    setShippingRates([]);
    setQuotedSubtotalCents(null);
    setShippingMethod("");
    setShippingError("");
  }

  async function calculateShipping() {
    if (quotingShipping || cart.length === 0) return;
    setQuotingShipping(true);
    setShippingError("");
    setShippingRates([]);
    setQuotedSubtotalCents(null);
    setShippingMethod("");
    try {
      const response = await fetch("/api/shipping-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map((item) => ({ productId: item.product.id, variantId: item.variant.id, quantity: item.quantity })),
          address: shippingAddress,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !Array.isArray(data.options) || data.options.length === 0) {
        throw new Error(data.error ?? "No delivery options are available for this address.");
      }
      setShippingRates(data.options);
      setQuotedSubtotalCents(Number.isSafeInteger(data.subtotalCents) ? data.subtotalCents : subtotal);
      setShippingMethod(data.options[0].id);
    } catch (error) {
      setShippingError(error instanceof Error ? error.message : "Could not calculate shipping.");
    } finally {
      setQuotingShipping(false);
    }
  }

  /* The server recalculates product and shipping prices before creating payment. */
  async function startCheckout() {
    if (checkingOut || cart.length === 0) return;
    if (!shippingMethod || shippingRates.length === 0) {
      setShippingError("Enter your shipping details and calculate delivery first.");
      return;
    }
    setCheckingOut(true);
    setCheckoutError("");
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map((item) => ({ productId: item.product.id, variantId: item.variant.id, quantity: item.quantity })),
          address: shippingAddress,
          shippingMethod,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.checkoutUrl) throw new Error(data.error ?? "Checkout could not be started. Please try again.");
      window.location.assign(data.checkoutUrl);
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : "Checkout could not be started. Please try again.");
      setCheckingOut(false);
    }
  }

  function updateQuantity(productId: string, variantId: number, delta: number) {
    setShippingRates([]);
    setQuotedSubtotalCents(null);
    setShippingMethod("");
    setCart((current) => current
      .map((item) => item.product.id === productId && item.variant.id === variantId
        ? { ...item, quantity: item.quantity + delta } : item)
      .filter((item) => item.quantity > 0 && item.quantity <= 10));
  }

  /* Two identical halves so the -50% translate loops seamlessly */
  const marqueeRun = [...MARQUEE_WORDS, ...MARQUEE_WORDS, ...MARQUEE_WORDS];

  return (
    <Page>
      <Global />

      <MarqueeBar aria-label={MARQUEE_WORDS.join(", ")}>
        <MarqueeTrack aria-hidden="true">
          {[0, 1].map((half) => (
            <span key={half} style={{ display: "inline-flex" }}>
              {marqueeRun.map((word, i) => <MarqueeItem key={`${half}-${i}`}>{word}</MarqueeItem>)}
            </span>
          ))}
        </MarqueeTrack>
      </MarqueeBar>

      <Header>
        <Wordmark href="/">Feminine Game<span style={{ color: GOLD }}>®</span></Wordmark>
        <Nav>
          <a href="#shop">Shop</a>
          <a href="#about">Our story</a>
        </Nav>
        <HeaderRight>
          <CartButton onClick={() => setCartOpen(true)}>
            Bag ({cart.reduce((n, item) => n + item.quantity, 0)})
          </CartButton>
        </HeaderRight>
      </Header>

      <Hero>
        <HeroImage src={HERO_IMAGE} alt="" />
        <HeroShade />
        <HeroInner>
          <HeroTitle>Self first.<br />No apologies.</HeroTitle>
          <HeroSide>
            <HeroCopy>
              Wear the reminder. Keep your standards. Protect your peace and your money.
              Everyday pieces for people who move with intention.
            </HeroCopy>
            <HeroCta href="#shop">Wear the mindset</HeroCta>
          </HeroSide>
        </HeroInner>
      </Hero>

      <CollectionHead id="shop">
        <SectionTitle>The Self First Collection</SectionTitle>
        <Count>{products.length} {products.length === 1 ? "product" : "products"}</Count>
      </CollectionHead>

      {loadError ? (
        <Status>We couldn't load the catalogue. Check your Printify credentials and shop ID, then refresh.</Status>
      ) : products.length === 0 ? (
        <Status>No products found in your Printify shop yet.</Status>
      ) : (
        <Grid>
          {products.map((product) => {
            const variants = sellableVariants(product);
            const selected = chosenVariant(product);
            const prices = variants.map((variant) => variant.retailPriceCents);
            const startingPrice = prices.length ? Math.min(...prices) : null;
            const names = optionNames(product);
            const images = product.images.filter((image) => image.src);
            const previewImage = selectedImage(product, selected);

            return (
              <ProductCard key={product.id}>
                <ImageBox>
                  {previewImage ? (
                    <img
                      src={previewImage}
                      alt={selected ? `${product.title}, ${variantLabel(selected)}` : product.title}
                      loading="lazy"
                    />
                  ) : (
                    <div style={{ height: "100%", display: "grid", placeItems: "center", color: "#aaa", fontSize: 13 }}>
                      Product image unavailable
                    </div>
                  )}
                  {images.length > 1 && <ImageCount>{images.length} views</ImageCount>}
                </ImageBox>
                <ProductMeta>
                  <div style={{ minWidth: 0 }}>
                    <ProductName>{product.title}</ProductName>
                    <ProductSub>{variants.length ? `${variants.length} variants available` : "Currently unavailable"}</ProductSub>
                  </div>
                  <Price>
                    {selected
                      ? money(selected.retailPriceCents)
                      : startingPrice !== null ? `From ${money(startingPrice)}` : "Price unavailable"}
                  </Price>
                </ProductMeta>

                {variants.length > 0 && names.length > 0 && (
                  <Options>
                    {names.map((name) => {
                      const option = product.options.find((candidate) => candidate.name === name);
                      const values = Array.from(new Set(
                        variants.map((variant) => variant.optionValues[name]).filter(Boolean)
                      ));
                      const selectedValue = selected?.optionValues[name] ?? values[0] ?? "";
                      /* Swatches only when Printify supplied a colour for every value; otherwise a dropdown */
                      const swatchable = option && isColorOption(option) &&
                        values.every((value) => swatchBackground(option, value));

                      return (
                        <div key={name}>
                          <OptionLabel>{name}: <strong>{selectedValue}</strong></OptionLabel>
                          {swatchable ? (
                            <Swatches role="group" aria-label={`${name} for ${product.title}`}>
                              {values.map((value) => (
                                <Swatch
                                  key={value}
                                  type="button"
                                  title={value}
                                  aria-label={`${name}: ${value}`}
                                  aria-pressed={selectedValue === value}
                                  $bg={swatchBackground(option, value)!}
                                  $active={selectedValue === value}
                                  onClick={() => chooseOption(product, name, value)}
                                />
                              ))}
                            </Swatches>
                          ) : (
                            <Select
                              style={{ marginTop: 6 }}
                              value={selectedValue}
                              onChange={(event) => chooseOption(product, name, event.target.value)}
                              aria-label={`${name} for ${product.title}`}
                            >
                              {values.map((value) => <option key={value} value={value}>{value}</option>)}
                            </Select>
                          )}
                        </div>
                      );
                    })}
                  </Options>
                )}

                {selected && <ProductSub style={{ marginTop: 10 }}>Selected: {variantLabel(selected)} · {money(selected.retailPriceCents)}</ProductSub>}
                <AddButton disabled={!selected} onClick={() => addToCart(product)}>
                  {selected ? "Add to bag" : "Unavailable"}
                </AddButton>
              </ProductCard>
            );
          })}
        </Grid>
      )}

      {notice && <Status role="status">{notice}</Status>}

      <About id="about">
        <AboutTitle>Keep your standards. Keep your money. Keep your peace.</AboutTitle>
        <AboutCopy>
          Feminine Game is about self-respect, financial discipline and avoiding the traps that pull you away from the life you want. This collection turns that mindset into everyday goods.
        </AboutCopy>
      </About>

      <Footer>
        <span>© {new Date().getFullYear()} Feminine Game</span>
        <span>Made to order</span>
        <span>Contact · Shipping · Returns</span>
      </Footer>

      {cartOpen && (
        <Overlay onClick={() => setCartOpen(false)}>
          <Drawer onClick={(event) => event.stopPropagation()}>
            <DrawerHead>
              <strong style={{ fontSize: 16 }}>Your bag</strong>
              <Close aria-label="Close bag" onClick={() => setCartOpen(false)}>×</Close>
            </DrawerHead>
            {cart.length === 0 ? (
              <Empty>Your bag is empty.<br />Choose a product and add it to your bag.</Empty>
            ) : (
              <>
                {cart.map((item) => (
                  <CartLine key={`${item.product.id}-${item.variant.id}`}>
                    <CartThumb>
                      {selectedImage(item.product, item.variant) && (
                        <img src={selectedImage(item.product, item.variant)!} alt="" />
                      )}
                    </CartThumb>
                    <div>
                      <ProductName>{item.product.title}</ProductName>
                      <ProductSub>{variantLabel(item.variant)}</ProductSub>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10 }}>
                        <SmallButton aria-label="Decrease quantity" onClick={() => updateQuantity(item.product.id, item.variant.id, -1)}>−</SmallButton>
                        <span style={{ fontSize: 13 }}>{item.quantity}</span>
                        <SmallButton aria-label="Increase quantity" onClick={() => updateQuantity(item.product.id, item.variant.id, 1)}>+</SmallButton>
                      </div>
                    </div>
                    <Price>{money(item.variant.retailPriceCents * item.quantity)}</Price>
                  </CartLine>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 22, fontSize: 14 }}>
                  <span>Product subtotal</span>
                  <strong>{money(quotedSubtotalCents ?? subtotal)}</strong>
                </div>
                <CheckoutForm>
                  <FormTitle>Shipping & delivery</FormTitle>
                  <ProductSub>Enter your shipping address to see available delivery options.</ProductSub>
                  <Field>Full name<FieldInput autoComplete="name" value={shippingAddress.fullName} onChange={(event) => updateAddress("fullName", event.target.value)} required placeholder="Full name" /></Field>
                  <FormGrid>
                    <Field>Email<FieldInput type="email" autoComplete="email" value={shippingAddress.email} onChange={(event) => updateAddress("email", event.target.value)} required placeholder="you@example.com" /></Field>
                    <Field>Phone<FieldInput type="tel" autoComplete="tel" value={shippingAddress.phone} onChange={(event) => updateAddress("phone", event.target.value)} required placeholder="Phone number" /></Field>
                  </FormGrid>
                  <Field>Country / region
                    <FieldSelect autoComplete="country" value={shippingAddress.country} onChange={(event) => updateAddress("country", event.target.value)} required>
                      <option value="US">United States</option><option value="CA">Canada</option><option value="GB">United Kingdom</option><option value="AU">Australia</option><option value="NZ">New Zealand</option><option value="IE">Ireland</option><option value="DE">Germany</option><option value="FR">France</option><option value="NL">Netherlands</option><option value="ES">Spain</option><option value="IT">Italy</option><option value="SE">Sweden</option><option value="NO">Norway</option><option value="DK">Denmark</option><option value="FI">Finland</option><option value="BE">Belgium</option><option value="AT">Austria</option><option value="CH">Switzerland</option><option value="PT">Portugal</option><option value="PL">Poland</option><option value="CZ">Czechia</option><option value="JP">Japan</option>
                    </FieldSelect>
                  </Field>
                  <Field>Address<FieldInput autoComplete="address-line1" value={shippingAddress.address1} onChange={(event) => updateAddress("address1", event.target.value)} required placeholder="Street address" /></Field>
                  <Field>Apartment, suite, etc. (optional)<FieldInput autoComplete="address-line2" value={shippingAddress.address2} onChange={(event) => updateAddress("address2", event.target.value)} placeholder="Apartment, unit, etc." /></Field>
                  <FormGrid>
                    <Field>City<FieldInput autoComplete="address-level2" value={shippingAddress.city} onChange={(event) => updateAddress("city", event.target.value)} required /></Field>
                    <Field>State / province / region<FieldInput autoComplete="address-level1" value={shippingAddress.region} onChange={(event) => updateAddress("region", event.target.value)} required /></Field>
                  </FormGrid>
                  <Field>ZIP / postal code<FieldInput autoComplete="postal-code" value={shippingAddress.zip} onChange={(event) => updateAddress("zip", event.target.value)} required /></Field>
                  <SecondaryButton type="button" onClick={calculateShipping} disabled={quotingShipping || checkingOut}>
                    {quotingShipping ? "Calculating delivery…" : "Calculate delivery"}
                  </SecondaryButton>
                  {shippingError && <ProductSub role="alert" style={{ color: "#b3261e" }}>{shippingError}</ProductSub>}
                  {shippingRates.length > 0 && <div style={{ display: "grid", gap: 8 }}>
                    <OptionLabel>Delivery options</OptionLabel>
                    {shippingRates.map((rate) => <DeliveryOption key={rate.id}>
                      <input type="radio" name="shipping-method" value={rate.id} checked={shippingMethod === rate.id} onChange={() => setShippingMethod(rate.id)} />
                      <span style={{ flex: 1 }}>{rate.label}</span><strong>{money(rate.amountCents)}</strong>
                    </DeliveryOption>)}
                    {(() => { const chosen = shippingRates.find((rate) => rate.id === shippingMethod); return chosen ? <>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}><span>Shipping</span><strong>{money(chosen.amountCents)}</strong></div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15 }}><span>Total</span><strong>{money((quotedSubtotalCents ?? subtotal) + chosen.amountCents)}</strong></div>
                    </> : null; })()}
                  </div>}
                </CheckoutForm>
                <PrimaryButton onClick={startCheckout} disabled={checkingOut || !shippingMethod || shippingRates.length === 0} style={checkingOut ? { opacity: 0.6, cursor: "wait" } : undefined}>
                  {checkingOut ? "Redirecting to secure payment…" : "Continue to checkout"}
                </PrimaryButton>
                {checkoutError && (
                  <ProductSub role="alert" style={{ marginTop: 12, color: "#b3261e" }}>{checkoutError}</ProductSub>
                )}
                <ProductSub style={{ marginTop: 12 }}>Your order is confirmed after payment is verified.</ProductSub>
              </>
            )}
          </Drawer>
        </Overlay>
      )}
    </Page>
  );
}