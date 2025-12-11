import { SvgIcon } from '@/components/icons/SvgIcon'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface CardProps {
  icon: string | { src: string }
  title: string
  description: string
  className?: string
}

export const FeatureCard = ({
  icon,
  title,
  description,
  className,
}: CardProps) => {
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="p-8">
        <div
          className={cn(
            'mb-4 flex h-12 w-12 items-center justify-center rounded-lg',
            className,
          )}
        >
          <SvgIcon src={icon} alt={title} className="h-6 w-6" />
        </div>
        <article className="prose">
          <h3 className="text-foreground mb-2 text-xl font-bold">{title}</h3>
          <p className="text-muted-foreground">{description}</p>
        </article>
      </CardContent>
    </Card>
  )
}
