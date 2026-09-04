import Footer from './components/Footer.jsx'
import Navbar from './components/Navbar.jsx'
import { useHashScroll } from './hooks/useHashScroll.js'
import { useScrollReveal } from './hooks/useScrollReveal.js'
import Countdown from './sections/Countdown.jsx'
import Events from './sections/Events.jsx'
import Gallery from './sections/Gallery.jsx'
import Gift from './sections/Gift.jsx'
import Hero from './sections/Hero.jsx'
import MapSection from './sections/MapSection.jsx'
import RSVP from './sections/RSVP.jsx'
import Story from './sections/Story.jsx'

export default function App() {
  useScrollReveal()
  useHashScroll()

  return (
    <>
      <Navbar />

      <main>
        <Hero />
        <Countdown />
        <Story />
        <Gallery />
        <Events />
        <MapSection />
        <RSVP />
        <Gift />
      </main>

      <Footer />
    </>
  )
}
