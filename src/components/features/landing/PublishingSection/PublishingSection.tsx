import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { FaArrowRight, FaBookOpen, FaFeatherAlt, FaMapMarkedAlt } from 'react-icons/fa';

export default function PublishingSection() {
  const t = useTranslations('components.features.landing.publishingSection');
  const cards = [
    {
      title: t('cards.shiori.title'),
      description: t('cards.shiori.description'),
      href: '/shiori',
      cta: t('cards.shiori.cta'),
      icon: FaMapMarkedAlt,
    },
    {
      title: t('cards.stories.title'),
      description: t('cards.stories.description'),
      href: '/stories',
      cta: t('cards.stories.cta'),
      icon: FaFeatherAlt,
    },
  ];

  return (
    <section className="w-full border-t border-stone-100 bg-[#fcfbf9] py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-3xl text-center">
          <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">
            <FaBookOpen />
            {t('badge')}
          </p>
          <h2 className="mt-4 text-3xl font-serif font-bold text-stone-800 sm:text-4xl">
            {t('titleLine1')}
            <br className="hidden sm:block" />
            {t('titleLine2')}
          </h2>
          <p className="mt-5 text-stone-600">
            {t('leadLine1')}
            {t('leadLine2')}
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
