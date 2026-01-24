import EventsWorldMap from "@/components/events/EventsWorldMap"
import Expectations from "@/components/home/expectations"
import Faq from "@/components/home/faq"
import HomeGallery from "@/components/home/gallery"
import Statistics from "@/components/home/statistics"
import HomeTestimonials from "@/components/home/testimonials"
import UpcomingEvents from "@/components/home/upcoming"
import CodeOfConduct from "@/components/layout/codeofconduct"
import Manifesto from "@/components/layout/manifesto"
import Title from "@/components/layout/title"
import { Enum_Expectation_Type } from "@/models/strapi"
import Link from "next/link"

export const revalidate = 3600

export default function Home() {
  return (
    <>
      <section id="title">
        <Title />
      </section>

      <section id="power-of-play" className="funfacts-area pt-100">
        <div className="container">
          <div className="section-title">
            <h2>
              Discover the power of <span>play</span>
            </h2>
            <p>Play engages both mind and body, making learning an active, immersive experience.</p>
          </div>
          <p>
            Welcome to #play14, a global movement that believes in the{" "}
            <strong>transformative power of play</strong>! We are a worldwide gathering of
            like-minded people who believe that{" "}
            <strong>playing is the best way to learn, share and get creative!</strong>
          </p>
          <p>
            Through play, individuals explore, experiment, and discover concepts in a hands-on way,
            which enhances understanding and retention. It encourages creativity, problem-solving,
            and collaboration, helping learners develop critical thinking skills.
          </p>
          <div className="d-flex justify-content-center">
            <blockquote>
              Tell me and I forget, teach me and I may remember, involve me and I learn
              <br />
              <strong>
                <em className="d-flex justify-content-end pt-4">Benjamin Franklin</em>
              </strong>
            </blockquote>
          </div>
          <p>
            Play also reduces stress and increases motivation, making the learning process enjoyable
            and effective. By creating a safe space for trial and error, play fosters a deeper, more
            meaningful connection to the material being learned.
          </p>
        </div>
      </section>

      <section id="join-the-movement" className="funfacts-area pt-100">
        <div className="container">
          <div className="section-title">
            <h2>
              Join the <span>movement</span>
            </h2>
            <p>Join us in cities worldwide to connect with like-minded individuals.</p>
          </div>
          <p>
            Whether you are a facilitator, educator, or curious mind, our events are designed to
            spark creativity, foster collaboration, and ignite new ideas. Dive into a world of
            playful experimentation.
          </p>
          <ul>
            <li>
              <strong>Global community:</strong> Connect with a diverse network of innovators.
            </li>
            <li>
              <strong>Endless fun:</strong> Engage in hands-on, playful activities.
            </li>
            <li>
              <strong>Inspire & be inspired:</strong> Share and discover new games, tools, and
              techniques.
            </li>
          </ul>
          <p>
            #play14 is an <Link href="/about/schedule">unconference</Link>, where{" "}
            <strong>all attendees are also contributors</strong>. Just show up with an open mind,
            and you&apos;ll have the chance to propose your own games or dive into the games
            suggested by others. It&apos;s all about participation, creativity, and shared fun!
          </p>
        </div>
      </section>

      <section id="upcoming-events">
        <UpcomingEvents />
      </section>

      <section id="statistics">
        <Statistics />
      </section>

      <section id="world-map">
        <h2 className="sr-only">Events Around the World</h2>
        <EventsWorldMap interactive={true} />
      </section>

      <section id="activities" className="funfacts-area pt-100">
        <div className="container">
          <div className="section-title">
            <h2>
              The <span>experience</span>
            </h2>
            <p>
              For two and a half days,{" "}
              <Link href="/players">people with many different profiles</Link> share{" "}
              <Link href="/games">games and activities</Link>, knowledge, and laughs.{" "}
              <strong>Everyone is welcome</strong>.
            </p>
          </div>
          <div className="d-flex justify-content-center">
            <blockquote>
              You can discover more about a person in an hour of play than a year of conversation
              <br />
              <strong>
                <em className="d-flex justify-content-end pt-4">Plato</em>
              </strong>
            </blockquote>
          </div>
          <p className="pt-5">Here are some examples of activities we engage in:</p>
          <ul>
            <li>
              A{" "}
              <Link href="/games/ball-point-game" target="_blank">
                serious game
              </Link>{" "}
              that you use as a metaphor in order to understand a new concept
            </li>
            <li>
              An{" "}
              <Link href="/games/eggolution" target="_blank">
                ice breaker
              </Link>{" "}
              game where people learn more about one another
            </li>
            <li>
              A{" "}
              <Link href="/games/brain-shock" target="_blank">
                warm up
              </Link>{" "}
              or an{" "}
              <Link href="/games/happy-salmon" target="_blank">
                energizer
              </Link>{" "}
              that you can use to raise the level of awareness and energy
            </li>
            <li>A facilitation technique that you can use in your daily work</li>
            <li>
              A{" "}
              <Link href="/games/cupcake-design-factory" target="_blank">
                team building
              </Link>{" "}
              exercise that fosters collaboration and self organization
            </li>
            <li>
              A{" "}
              <Link href="/games/ball-runner" target="_blank">
                game design
              </Link>{" "}
              session where you invent a new game to teach something new
            </li>
            <li>
              A soul searching, deep-dive introspection session where you learn about yourself
            </li>
            <li>
              A one-on-one coaching session where you will find some answers with the help of a
              friend
            </li>
            <li>A brainstorming session on a question or problem that wakes you up at night</li>
            <li>
              A{" "}
              <Link href="/games/doodling-together" target="_blank">
                creative session
              </Link>{" "}
              where you sketch, doodle, or build something together
            </li>
            <li>
              A fun and energetic time with{" "}
              <Link href="https://youtu.be/N2quY1ZPF50" target="_blank" rel="noopener">
                dancing
              </Link>
              ,{" "}
              <Link href="https://youtu.be/jpLCTQgHhqs" target="_blank" rel="noopener">
                singing
              </Link>{" "}
              or being silly together
            </li>
            <li>
              An{" "}
              <Link href="https://youtu.be/T7HPg2-xowc" target="_blank" rel="noopener">
                improv theater
              </Link>{" "}
              session where you can work on your confidence and ability to speak publicly
            </li>
            <li>
              A more esoteric session on a practice/hobby you want to share like yoga, laughter
              yoga, Tai Chi, Qigong, meditation, mindfulness, aikido, ...
            </li>
          </ul>

          <p>
            Join us in order to develop your <strong>facilitation skills</strong>, increase your{" "}
            <strong>ability to accompany change</strong> in your organization,{" "}
            <strong>foster your creativity</strong> and improve your{" "}
            <strong>capacity to innovate</strong>.
          </p>
        </div>
      </section>

      <section id="manifesto-and-code-of-conduct" className="funfacts-area pt-100">
        <div className="container">
          <div className="section-title">
            <h2>
              What we <span>stand for</span>
            </h2>
            <p>
              A game or activity at #play14 could be pretty much anything as long as it respects our{" "}
              <Link href="/about/values">Manifesto and Code of Conduct</Link>.
            </p>
          </div>
          <div className="row justify-content-center">
            <div className="col-lg-10 col-md-12 pt-4">
              <Manifesto />
            </div>
            <div className="col-lg-10 col-md-12 pt-4">
              <CodeOfConduct />
            </div>
          </div>
        </div>
      </section>

      <section id="testimonials" className="funfacts-area pt-100">
        <div className="container">
          <div className="section-title">
            <h2>
              What our community <span>says</span>
            </h2>
            <p>
              Hear from members of the #play14 community about their experiences. These testimonials
              capture the spirit, impact, and joy of our events around the world.
            </p>
          </div>
        </div>
        <HomeTestimonials />
      </section>

      <section id="gallery" className="funfacts-area pt-100">
        <div className="container">
          <div className="section-title">
            <h2>
              Photo <span>gallery</span>
            </h2>
            <p>
              #play14 is first and foremost a community of people, a family, and an incredible human
              adventure.
            </p>
          </div>
        </div>
        <HomeGallery />
      </section>

      <section id="benefits" className="funfacts-area pt-100">
        <div className="container">
          <div className="section-title">
            <h2>
              What&apos;s in it <span>for you</span>
            </h2>
            <p>
              Here are some of the things that you can expect when attending a #play14 event.
              However, be ready to &quot;Expect the unexpected!&quot;
            </p>
          </div>
        </div>
        <Expectations type={Enum_Expectation_Type.Main} />
      </section>

      <section id="faq" className="funfacts-area pt-100 pb-70">
        <div className="container">
          <div className="section-title">
            <h2>
              Frequently asked <span>questions</span>
            </h2>
            <p>
              Find answers to the most common questions about #play14 events, how they work, and
              what to expect when you join us.
            </p>
          </div>
          <div className="row justify-content-center">
            <div className="col-lg-10 col-md-12">
              <Faq />
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
