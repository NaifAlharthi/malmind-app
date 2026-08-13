// The Saudi flag as a real image (Twemoji asset, CC-BY 4.0), because Windows
// renders the 🇸🇦 emoji as bare "SA" letters. Size with className.
export default function SaudiFlag({ className = 'h-3.5 w-[18px]' }: { className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/saudi-flag.svg" alt="" className={`${className} rounded-[2px] object-cover inline-block`} aria-hidden />;
}
