import Link from 'next/link';
import { FaArrowRight, FaBookOpen, FaFeatherAlt, FaMapMarkedAlt } from 'react-icons/fa';

const cards = [
  {
    title: '旅のしおり',
    description:
      '旅程・費用・メモをまとめて公開。同行者や家族に、URLひとつで旅の全体像を共有できます。',
    href: '/shiori',
    cta: '旅のしおりの使い方を見る',
    icon: FaMapMarkedAlt,
  },
  {
    title: 'ブログ（blog.tabide.ai）',
    description:
      '旅の背景や気づき、現地で役立った情報を記事化。旅のしおりの埋め込みで、実用性の高い旅行記事を作れます。',
    href: '/blog/guide',
    cta: 'ブログ機能を詳しく見る',
    icon: FaFeatherAlt,
  },
];

export default function PublishingSection() {
  return (
    <section className="w-full border-t border-stone-100 bg-[#fcfbf9] py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-3xl text-center">
          <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">
            <FaBookOpen />
            Share your travel story
          </p>
          <h2 className="mt-4 text-3xl font-serif font-bold text-stone-800 sm:text-4xl">
            計画で終わらせず、
            <br className="hidden sm:block" />
            旅の価値を「伝わる形」に。
          </h2>
          <p className="mt-5 text-stone-600">
            Tabideaでは、作ったプランを「旅のしおり」として公開したり、ブログ記事として発信したりできます。
            旅行前の共有にも、旅行後の記録にも使える導線を用意しました。
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {cards.map(({ title, description, href, cta, icon: Icon }) => (
            <article key={title} className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                <Icon />
              </div>
              <h3 className="text-xl font-semibold text-stone-800">{title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-stone-600">{description}</p>
              <Link
                href={href}
                className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:text-emerald-800"
              >
                {cta}
                <FaArrowRight className="text-xs" />
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
