import F1Icon from '@/assets/icons/features/f1.svg'
import F2Icon from '@/assets/icons/features/f2.svg'
import F3Icon from '@/assets/icons/features/f3.svg'
import { FeatureCard } from '@/components/islands/FeatureCard'

interface Feature {
  icon: { src: string }
  className?: string
  title: string
  description: string
}

export const Features = ({ t }: { t: I18n.Schema['landing'] }) => {
  const features: Feature[] = [
    {
      icon: F1Icon,
      className:
        'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
      title: t.features.feature1Title,
      description: t.features.feature1Desc,
    },
    {
      icon: F2Icon,
      className:
        'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
      title: t.features.feature2Title,
      description: t.features.feature2Desc,
    },
    {
      icon: F3Icon,
      className:
        'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
      title: t.features.feature3Title,
      description: t.features.feature3Desc,
    },
  ]

  return (
    <>
      <h2 className="mb-8 text-center text-xl font-semibold sm:text-3xl">
        {t.features.title}:
      </h2>
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature, index) => (
          <FeatureCard key={index} {...feature} />
        ))}
      </div>
    </>
  )
}
