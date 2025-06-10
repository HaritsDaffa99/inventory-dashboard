import dynamic from 'next/dynamic'

const Hero = dynamic(() => import('@/components/landing/Hero'))
const About = dynamic(() => import('@/components/landing/About'))
const Features = dynamic(() => import('@/components/landing/Features'))
const CTA = dynamic(() => import('@/components/landing/CTA'))

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      <Hero />
      <About />
      <Features />
      <CTA />
    </main>
  )
}