import Image from "next/image";
import Link from "next/link";

export default function LegacyLogo() {
  return (
    <Link href="/" className="flex items-center gap-2">
      <div className="relative w-8 h-8">
        <Image
          src="/images/icon.png"
          alt="Tabidea Logo"
          fill
          className="object-contain"
        />
      </div>
      <span className="font-bold text-xl text-stone-800 tracking-tight">
        Tabidea
      </span>
    </Link>
  );
}
