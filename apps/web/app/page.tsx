import type { Metadata } from 'next'
import HomePageContent from '@/components/home-page'

const title = 'Trabajo de infraestructura Solana con recompensas verificables'
const description = 'Publica o encuentra tareas de infraestructura con alcance claro, revisión comunitaria y recompensas en escrow sobre Solana Devnet.'

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/' },
  openGraph: { title, description, url: '/', type: 'website' },
  twitter: { card: 'summary', title, description },
}

export default function HomePage() {
  return <HomePageContent />
}
