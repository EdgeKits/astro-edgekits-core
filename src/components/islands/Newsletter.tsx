import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Loader2, Mail } from 'lucide-react'

// Shadcn UI imports
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form'

interface NewsletterProps {
  t: I18n.Schema['blog']['newsletter']
}

export function Newsletter({ t }: NewsletterProps) {
  const [isSuccess, setIsSuccess] = useState(false)

  // Simple validation schema
  const formSchema = z.object({
    email: z.string().email({
      message: t.validation.invalidEmail,
    }),
  })

  // 1. Initialize form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
    },
  })

  // 2. Submit handler
  async function onSubmit(values: z.infer<typeof formSchema>) {
    // Simulate network request
    await new Promise((resolve) => setTimeout(resolve, 1000))

    console.log('Submitted:', values)
    setIsSuccess(true)
  }

  // 3. Success state
  if (isSuccess) {
    return (
      <div className="animate-in fade-in zoom-in my-8 rounded-xl border border-green-200 bg-green-50/50 p-8 text-center duration-300 dark:border-green-800 dark:bg-green-900/20">
        <div className="mb-4 flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400">
            <Mail className="h-8 w-8" />
          </div>
        </div>
        <h3 className="mb-2 text-xl font-bold text-green-800 dark:text-green-300">
          {t.success}
        </h3>
      </div>
    )
  }

  // 4. Main form
  return (
    <div className="bg-card text-card-foreground my-8 rounded-xl border p-8 shadow-sm">
      <div className="mb-6">
        <h3 className="mt-0 mb-2 text-2xl font-bold tracking-tight">
          {t.title}
        </h3>
        <p className="text-muted-foreground">{t.description}</p>
      </div>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-3 sm:flex-row"
        >
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormControl>
                  <Input
                    placeholder={t.placeholder}
                    {...field}
                    className="bg-background"
                  />
                </FormControl>
                {/* Optional: validation error display */}
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            disabled={form.formState.isSubmitting}
            className="w-full sm:w-auto"
          >
            {form.formState.isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Please wait
              </>
            ) : (
              t.button
            )}
          </Button>
        </form>
      </Form>
    </div>
  )
}
