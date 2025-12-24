"use client"

import { useState } from "react"

interface FaqItem {
  id: string
  question: string
  answer: React.ReactNode
}

const faqItems: FaqItem[] = [
  {
    id: "event-duration",
    question: "How long does an event last?",
    answer: (
      <p>
        A typical #play14 event lasts <strong>2.5 days</strong> on average.
        Events usually start on Friday afternoon or evening and end on Sunday
        afternoon. This format allows participants to fully immerse themselves
        in the experience while still having time to travel.
      </p>
    ),
  },
  {
    id: "unconference",
    question: "What is an unconference?",
    answer: (
      <p>
        An unconference is a participant-driven event where{" "}
        <strong>attendees are also contributors</strong>. #play14 follows the
        Open Space Technology format, meaning there is no predefined agenda.
        Instead, participants propose games and activities each morning during
        the marketplace session, and the schedule emerges organically.
      </p>
    ),
  },
  {
    id: "propose-game",
    question: "Do I need to propose a game to attend?",
    answer: (
      <p>
        <strong>No, not at all!</strong> It&apos;s perfectly fine to attend
        #play14 without proposing any game or activity. You can simply
        participate in sessions proposed by others. However, if you discover a
        game you love, you might feel inspired to facilitate it at a future
        event!
      </p>
    ),
  },
  {
    id: "law-of-two-feet",
    question: "What is the Law of Two Feet?",
    answer: (
      <p>
        The Law of Two Feet is a core principle of Open Space Technology. It
        means that if you find yourself in a session where you are{" "}
        <strong>neither learning nor contributing</strong>, you have the
        responsibility to use your two feet and move somewhere else. Neither the
        facilitator nor other participants should feel offended — it&apos;s
        simply how the format works.
      </p>
    ),
  },
  {
    id: "who-can-attend",
    question: "Who can attend #play14?",
    answer: (
      <p>
        <strong>Everyone is welcome!</strong> Our community includes
        facilitators, agile coaches, educators, trainers, HR professionals, team
        leaders, and curious minds from all backgrounds. Whether you&apos;re
        experienced with serious games or completely new to the concept,
        you&apos;ll find your place at #play14.
      </p>
    ),
  },
  {
    id: "commercial",
    question: "Is #play14 a commercial event?",
    answer: (
      <p>
        <strong>No, #play14 is non-profit.</strong> We are a community-driven
        movement focused on sharing knowledge and practices rather than selling
        services. Event fees cover venue rental, food, and materials. Any
        surplus is reinvested into future events or the community.
      </p>
    ),
  },
  {
    id: "activities",
    question: "What kind of activities can I expect?",
    answer: (
      <p>
        You can expect a wide variety of activities including{" "}
        <strong>serious games</strong> that teach concepts through play,{" "}
        <strong>ice breakers</strong> to get to know each other,{" "}
        <strong>energizers</strong> to boost the group&apos;s energy,{" "}
        <strong>team building exercises</strong>, facilitation techniques,
        creative sessions, improv theater, and even more esoteric activities
        like yoga or meditation. The beauty of an unconference is that anything
        can happen!
      </p>
    ),
  },
  {
    id: "experience",
    question: "Do I need prior experience with games or facilitation?",
    answer: (
      <p>
        <strong>No prior experience is needed.</strong> #play14 welcomes
        beginners and experts alike. Many participants discover new games at
        their first event and return to facilitate those same games later. The
        community is supportive and everyone learns from each other, regardless
        of experience level.
      </p>
    ),
  },
]

export default function Faq() {
  const [openId, setOpenId] = useState<string | null>(null)

  const toggleItem = (id: string) => {
    setOpenId(openId === id ? null : id)
  }

  return (
    <div className="faq-accordion">
      <ul className="accordion">
        {faqItems.map((item) => {
          const isOpen = openId === item.id
          return (
            <li className="accordion__item" key={item.id}>
              <h3 className="accordion__heading">
                <button
                  className={`accordion__button${isOpen ? " active" : ""}`}
                  onClick={() => toggleItem(item.id)}
                  aria-expanded={isOpen}
                  aria-controls={`faq-panel-${item.id}`}
                  id={`faq-button-${item.id}`}
                  type="button"
                >
                  <i className="bx bx-chevron-down" aria-hidden="true"></i>
                  <span>{item.question}</span>
                </button>
              </h3>
              <div
                id={`faq-panel-${item.id}`}
                role="region"
                aria-labelledby={`faq-button-${item.id}`}
                className={`accordion__panel${isOpen ? " show" : ""}`}
                hidden={!isOpen}
              >
                {item.answer}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
