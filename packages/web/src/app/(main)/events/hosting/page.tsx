import type { Metadata } from "next"
import Link from "next/link"
import CodeOfConduct from "@/components/layout/codeofconduct"
import Page from "@/components/layout/page"
import styles from "./hosting.module.scss"

export const metadata: Metadata = {
  title: "Events | Hosting guide",
  description:
    "Complete guide for hosting a #play14 event - from planning and organizing to running the first evening",
}

const TableOfContents = () => (
  <nav className={styles.toc}>
    <h3>Contents</h3>
    <h4>Part 1: Organizing a #play14 event</h4>
    <ol>
      <li>
        <a href="#becoming-host">How to become a host</a>
      </li>
      <li>
        <a href="#responsibilities">Your responsibilities</a>
      </li>
      <li>
        <a href="#venue">Choosing the right venue</a>
      </li>
      <li>
        <a href="#materials">Planning materials and supplies</a>
      </li>
      <li>
        <a href="#food-drinks">Food and drinks</a>
      </li>
      <li>
        <a href="#support">Support from #play14</a>
      </li>
      <li>
        <a href="#website">Website and registration</a>
      </li>
      <li>
        <a href="#marketing">Marketing and communication</a>
      </li>
      <li>
        <a href="#merchandising">Merchandising and welcome kit</a>
      </li>
      <li>
        <a href="#budget">Budget and revenue</a>
      </li>
      <li>
        <a href="#sustainability">Sustainability</a>
      </li>
    </ol>

    <h4>Part 2: Running the first evening</h4>
    <ol start={12}>
      <li>
        <a href="#before-the-day">Things to do before the day</a>
      </li>
      <li>
        <a href="#preparing-venue">Preparing the venue</a>
      </li>
      <li>
        <a href="#arriving">Arriving</a>
      </li>
      <li>
        <a href="#pre-kickoff">Pre-kickoff</a>
      </li>
      <li>
        <a href="#starting">Starting</a>
      </li>
      <li>
        <a href="#group-activities">Group activities</a>
      </li>
      <li>
        <a href="#open-free-activities">Open and free activities</a>
      </li>
    </ol>

    <h4>Part 3: During the day</h4>
    <ol start={19}>
      <li>
        <a href="#starting-day">Starting the day</a>
      </li>
      <li>
        <a href="#game-sessions">Game sessions</a>
      </li>
      <li>
        <a href="#meals">Lunch and dinners</a>
      </li>
    </ol>

    <h4>Part 4: Ending the event</h4>
    <ol start={22}>
      <li>
        <a href="#retrospective">Retrospective</a>
      </li>
      <li>
        <a href="#cleanup">Cleanup</a>
      </li>
      <li>
        <a href="#goodbye">Saying goodbye</a>
      </li>
    </ol>

    <h4>Part 5: Closing the event</h4>
    <ol start={25}>
      <li>
        <a href="#thank-you">Thank you to participants</a>
      </li>
      <li>
        <a href="#team-retro">Host team retrospective</a>
      </li>
      <li>
        <a href="#financial">Financial closeout</a>
      </li>
      <li>
        <a href="#publishing">Publishing results</a>
      </li>
      <li>
        <a href="#announce-next">Announce your next date</a>
      </li>
    </ol>

    <h4>Appendix</h4>
    <ol start={30}>
      <li>
        <a href="#code-of-conduct">Code of conduct</a>
      </li>
      <li>
        <a href="#open-space-principles">Open space principles</a>
      </li>
      <li>
        <a href="#manifesto">Manifesto</a>
      </li>
    </ol>
  </nav>
)

export default function HostingPage() {
  return (
    <>
      <Page name="Hosting guide" />
      {/* Floating Table of Contents Sidebar (large screens only) */}
      <aside className={styles.tocSidebar}>
        <TableOfContents />
      </aside>

      {/* Main Content */}
      <div className={`container ${styles.hosting}`}>
        {/* Introduction */}
        <section id="intro" className="pt-70">
          <p className={styles.lead}>
            This guide will support you through the entire journey of hosting a #play14 event — from
            the initial planning and organization, all the way through to making the first 114
            minutes brilliant.
          </p>

          <p>
            Whether you&apos;re considering hosting your first #play14 event or preparing to kick
            off an event you&apos;ve already organized, you&apos;ll find practical guidance,
            checklists, and insights from years of experience across the global #play14 community.
          </p>
        </section>

        {/* Inline Table of Contents (small screens only) */}
        <div className={styles.tocInline}>
          <TableOfContents />
        </div>

        {/* PART 1: ORGANIZING A #PLAY14 EVENT */}
        <div className={styles.partDivider}>
          <h2>Part 1: Organizing a #play14 event</h2>
          <p>Everything you need to know to plan and organize a successful #play14 event.</p>
        </div>

        {/* Section 1: How to become a host */}
        <section id="becoming-host" className="pt-70">
          <h2>1. How to become a #play14 event host</h2>

          <h3>The first rule</h3>
          <p>
            You must have participated in at least one #play14 event. This experience allows you to
            gain insight into our community and understand the mindset we aim to cultivate at
            #play14. We strongly believe that only by experiencing #play14 can you reproduce this
            wonderful and playful experience.
          </p>

          <h3>The second rule</h3>
          <p>
            You need to find a mentor to help and guide you for your first time. As a host,
            you&apos;ll be responsible for upholding the spirit of the original event and ensuring a
            memorable experience for your attendees.
          </p>

          <h3>Finding a mentor</h3>
          <p>
            Mentors are members of the #play14 community who have experience organizing #play14
            events and are able to help others do the same.
          </p>
          <p>
            To find a mentor, you can contact the group of mentors and someone will respond. You can
            also identify mentors on the <Link href="/players?position=mentor">players list</Link>{" "}
            by filtering for the mentor role.
          </p>
        </section>

        {/* Section 2: Your responsibilities */}
        <section id="responsibilities" className="pt-70">
          <h2>2. Your responsibilities as a host</h2>

          <p>As a host, your primary responsibilities include:</p>
          <ul>
            <li>Securing a venue</li>
            <li>Selecting a date</li>
            <li>Providing food and beverages</li>
            <li>Gathering game materials</li>
            <li>Bringing a positive attitude</li>
          </ul>
          <p>The rest is in the hands of the players!</p>
          <p>
            We recommend forming a team of at least three local organizers to make hosting
            manageable, particularly for venue selection.
          </p>
        </section>

        {/* Section 3: Choosing the right venue */}
        <section id="venue" className="pt-70">
          <h2>3. Choosing the right venue</h2>

          <p>
            When selecting a venue, ensure it can accommodate 30 to 70 participants, depending on
            your expected turnout. Ideally, venues should have a unique charm or character.
          </p>

          <h3>Key venue requirements</h3>

          <div className="row">
            <div className="col-lg-6 col-md-12">
              <h4>Common area</h4>
              <ul>
                <li>Space for icebreakers and group activities</li>
                <li>Marketplace displayed visibly on the wall</li>
              </ul>
            </div>
            <div className="col-lg-6 col-md-12">
              <h4>Food corner</h4>
              <ul>
                <li>Access to snacks and meals</li>
                <li>Drinks available throughout the event</li>
              </ul>
            </div>
          </div>

          <h4>Gaming areas</h4>
          <ul>
            <li>At least three separate zones equipped with tables and chairs</li>
            <li>A whiteboard or flip chart in each area</li>
            <li>Ample space for participants to move around the tables</li>
          </ul>

          <p>The capacity of your venue will dictate how many attendees you can accommodate.</p>
        </section>

        {/* Section 4: Planning materials and supplies */}
        <section id="materials" className="pt-70">
          <h2>4. Planning materials and supplies</h2>

          <p>Here&apos;s a basic list of items you should consider:</p>

          <h3>Furniture</h3>
          <ul>
            <li>Tables and chairs (to be provided by the venue)</li>
            <li>Whiteboards and flip charts</li>
          </ul>

          <h3>Sticky notes</h3>
          <ul>
            <li>XL stickies for the marketplace</li>
            <li>Square (yellow &amp; colors)</li>
            <li>Long (yellow &amp; colors)</li>
          </ul>

          <h3>Markers</h3>
          <ul>
            <li>At least one Sharpie for each player</li>
            <li>Paperboard markers</li>
            <li>Whiteboard markers</li>
          </ul>

          <h3>Paper and tape</h3>
          <ul>
            <li>A large paper roll for the marketplace</li>
            <li>Masking tape</li>
            <li>Tape, scissors, and measuring tape</li>
            <li>Various paper types (plain and colored)</li>
          </ul>

          <h3>Game materials</h3>
          <ul>
            <li>Plastic play balls</li>
            <li>Poker chips</li>
            <li>Card decks</li>
            <li>Happy Salmon</li>
            <li>Any other games you think might be fun</li>
          </ul>
        </section>

        {/* Section 5: Food and drinks */}
        <section id="food-drinks" className="pt-70">
          <h2>5. Food and drinks</h2>

          <p>
            To maintain high energy levels throughout the event, it&apos;s essential to provide
            meals and beverages, which fall under your hosting duties.
          </p>

          <h3>Meals</h3>
          <p>Typically, we provide two lunches and two dinners:</p>
          <ul>
            <li>
              <strong>First dinner:</strong> A festive welcome dinner, usually catered
            </li>
            <li>
              <strong>First lunch:</strong> A light yet substantial lunch to sustain participants
              through the afternoon
            </li>
            <li>
              <strong>Second dinner:</strong> Casual pizza and beer
            </li>
            <li>
              <strong>Second lunch:</strong> Another light lunch, varying from the previous
              day&apos;s meal
            </li>
          </ul>
          <p>
            Ensuring a diverse menu is crucial, especially considering dietary restrictions like
            vegan and gluten-free options.
          </p>

          <h3>Drinks</h3>
          <p>
            Always have a supply of hot beverages and refreshments available at any time. Options
            typically include:
          </p>
          <ul>
            <li>Coffee</li>
            <li>Tea</li>
            <li>Water</li>
            <li>Soft drinks (Coke, orange juice)</li>
            <li>Alcohol (beer, wine), depending on your preference as the host</li>
          </ul>

          <h3>Snacks</h3>
          <p>Offer snacks throughout the day for additional energy:</p>
          <ul>
            <li>Pastries for breakfast</li>
            <li>Fresh fruit</li>
            <li>Cereal and chocolate bars</li>
          </ul>
        </section>

        {/* Section 6: Support from #play14 */}
        <section id="support" className="pt-70">
          <h2>6. Support from the #play14 global organization</h2>

          <p>
            The #play14 global organization will provide you with shared resources, and
            co-founders/mentors will assist you in hosting your event, so you won&apos;t be alone in
            this journey.
          </p>
          <p>
            We maintain a Slack channel and a WhatsApp Community for communication among local
            organizers and offer video conferencing for additional support.
          </p>
          <p>
            At least one co-founder/mentor will attend your event to help with organization and
            ensure the essence of #play14 is honored.
          </p>
        </section>

        {/* Section 7: Website and registration */}
        <section id="website" className="pt-70">
          <h2>7. Website and registration</h2>

          <p>
            You will be able to create a dedicated page for your event on the #play14 website,
            detailing the location, dates, and registration. To do this, you will need to request
            access to the CMS backend that powers the website from the founders.
          </p>
          <p>
            We can manage ticketing and financial aspects with the ticketing system and bank account
            of the central organization; however, you are welcome to use your own registration
            system if you prefer.
          </p>
        </section>

        {/* Section 8: Marketing and communication */}
        <section id="marketing" className="pt-70">
          <h2>8. Marketing and communication</h2>

          <p>We have several communication and marketing tools at your disposal, including:</p>
          <ul>
            <li>Twitter</li>
            <li>LinkedIn</li>
            <li>Google</li>
            <li>YouTube</li>
            <li>Facebook</li>
            <li>Newsletter (Mailchimp)</li>
          </ul>
          <p>
            While you will primarily handle promoting your event and encouraging registration, feel
            free to reach out for assistance from co-founders or access the available tools and
            services.
          </p>
        </section>

        {/* Section 9: Merchandising and welcome kit */}
        <section id="merchandising" className="pt-70">
          <h2>9. Merchandising and welcome kit</h2>

          <p>
            Each participant receives a #play14 t-shirt, which has become part of our brand
            identity. Ideally, the t-shirts should be:
          </p>
          <ul>
            <li>Printed locally</li>
            <li>Black in color, which makes the logo visible</li>
            <li>Made from organic cotton</li>
          </ul>

          <h3>Additional welcome kit items may include:</h3>
          <ul>
            <li>#play14 stickers</li>
            <li>LEGO Serious Play kits</li>
            <li>Sticky notes</li>
            <li>Sharpie markers</li>
            <li>Story cubes</li>
            <li>Venue or sponsor merchandise</li>
          </ul>
        </section>

        {/* Section 10: Budget and revenue */}
        <section id="budget" className="pt-70">
          <h2>10. Budget and revenue</h2>

          <p>
            We aim to keep ticket prices as affordable as possible to maximize participation. Most
            expenses go toward food and drinks, welcome kits, materials, and venue costs (if
            applicable).
          </p>

          <h3>Tickets</h3>
          <p>
            Ticket sales are the primary funding source for #play14 events. Prices may vary based on
            location and local organizer decisions. Some organizers successfully secure free venues,
            reducing financial pressure, while others may need to increase ticket prices if they pay
            for the venue.
          </p>
          <p>
            You can also consider varied ticket types, such as all-event passes, daily tickets, or
            tiered pricing (early bird, normal, late).
          </p>

          <h3>Sponsors</h3>
          <p>
            Finding sponsors can greatly enhance your event. Sponsorship can include monetary
            contributions, free venues, food, drinks, or materials. It&apos;s your responsibility as
            a local host to seek sponsors.
          </p>

          <h3>Mentor participation</h3>
          <p>
            We encourage the presence of at least one #play14 mentor at each new event to provide
            support and ensure everything runs smoothly. A portion of your budget should be
            allocated for the mentor&apos;s travel and accommodation expenses. Choosing a mentor who
            lives nearby can reduce travel costs and improve communication.
          </p>

          <h3>Profit and loss</h3>
          <p>
            #play14 is and always will be a non-profit. #play14 operates as a non-profit
            organization based in Luxembourg that supports some European events, but you are free to
            decide how to manage the finances locally.
          </p>
          <p>Any profit from your event should be:</p>
          <ul>
            <li>reinvested into future events</li>
            <li>contributed back to the global organization to support others</li>
            <li>or used to purchase games and materials</li>
          </ul>
          <p>
            Conversely, should you incur financial losses, the #play14 global organization will
            assist you. Typically, events break even, and we&apos;ve enjoyed stability without major
            financial issues.
          </p>
          <p>
            Trust is fundamental to #play14, so we expect transparency regarding all financial
            dealings. The CMS backend of the website contains a section where you will have to
            provide financial details about your events.
          </p>
        </section>

        {/* Section 11: Sustainability */}
        <section id="sustainability" className="pt-70">
          <h2>11. Sustainability</h2>

          <p>
            As a host, you have the opportunity to make your event environmentally friendly. We
            recommend:
          </p>
          <ul>
            <li>Using reusable glasses and tableware instead of single-use plastics</li>
            <li>Sorting waste appropriately</li>
            <li>Selecting eco-label products for supplies and stationery</li>
          </ul>
          <p>
            Some teams even opt to make their events carbon-neutral by offsetting the carbon
            footprint.
          </p>
        </section>

        {/* PART 2: RUNNING THE FIRST EVENING */}
        <div className={styles.partDivider}>
          <h2>Part 2: Running the first evening</h2>
          <p>
            The guide below was written by Chris Caswell and Nicole Helmerich to help hosts make the
            first 114 minutes of #play14 brilliant.
          </p>
          <p className={styles.attribution}>
            <em>
              The idea for this guide was born over coffee at #play14 Berlin in June 2025, when
              Julian Kea and Chris wondered whether a short guide might help hosts set up and kick
              off #play14. Chris and Nicole picked up the idea, wrote it — and here it is.
            </em>
          </p>
        </div>

        {/* Section 12: Things to do before the day */}
        <section id="before-the-day" className="pt-70">
          <h2>12. Things to do before the day</h2>

          <h3>Arrange / Find out</h3>
          <ul className={styles.checklist}>
            <li>
              Check that there are no planned fire alarms or other venue constraints we need to be
              aware of
            </li>
            <li>
              Find out whether you need a first aid contact due to regulations, venue rules, etc.
            </li>
            <li>Organize who will take photos during the event</li>
          </ul>

          <h3>Buy food and drinks</h3>
          <div className="row">
            <div className="col-lg-6 col-md-12">
              <h4>Minimum</h4>
              <ul>
                <li>(Quality) Coffee</li>
                <li>Tea</li>
                <li>Milk (dairy and plant-based)</li>
                <li>Water</li>
                <li>Healthy snacks (fruit, nuts, granola bars, etc.)</li>
                <li>Energizing snacks (chocolate, etc.)</li>
              </ul>
            </div>
            <div className="col-lg-6 col-md-12">
              <h4>Ideas</h4>
              <ul>
                <li>Soft drinks (variety)</li>
                <li>Alcohol</li>
              </ul>
            </div>
          </div>

          <h3>Buy materials</h3>
          <div className="row">
            <div className="col-lg-6 col-md-12">
              <h4>Minimum</h4>
              <ul>
                <li>Black markers (sharpies)</li>
                <li>Writing pens/pencils</li>
                <li>Coloring pens/pencils</li>
                <li>Sticky notes in different sizes</li>
                <li>Extra-large sticky notes for the marketplace</li>
                <li>Flipchart paper / posters</li>
                <li>Blank paper</li>
                <li>Tape (masking, strong tape, washi tape—many colors)</li>
                <li>Brown paper roll</li>
              </ul>
            </div>
            <div className="col-lg-6 col-md-12">
              <h4>Ideas</h4>
              <ul>
                <li>Colored paper</li>
                <li>Scissors</li>
                <li>Other markers / pens (e.g. Neuland)</li>
                <li>String (colored)</li>
                <li>Name tags</li>
              </ul>
            </div>
          </div>

          <h3>Gather kit</h3>
          <div className="row">
            <div className="col-lg-6 col-md-12">
              <h4>Minimum</h4>
              <ul>
                <li>Speakers for music</li>
                <li>Laptop to check people in/communicate</li>
                <li>Noisemaker(s)—e.g., chimes or a gong</li>
                <li>Camera</li>
              </ul>
            </div>
            <div className="col-lg-6 col-md-12">
              <h4>Ideas</h4>
              <ul>
                <li>Printer</li>
                <li>Games (board games/parlor games/card games)</li>
                <li>Dice</li>
                <li>Workshop kit (e.g. debriefing cube or pip decks)</li>
                <li>Books</li>
                <li>Balls</li>
                <li>Lego</li>
              </ul>
            </div>
          </div>

          <h3>Giveaways</h3>
          <div className="row">
            <div className="col-lg-6 col-md-12">
              <h4>Minimum</h4>
              <ul>
                <li>#play14 t-shirts (collect size preferences during registration)</li>
              </ul>
            </div>
            <div className="col-lg-6 col-md-12">
              <h4>Ideas</h4>
              <ul>
                <li>Stickers</li>
              </ul>
            </div>
          </div>

          <h3>Food &amp; catering</h3>
          <ul>
            <li>Day 1: Dinner</li>
            <li>Day 2: Breakfast</li>
            <li>Day 2: Lunch</li>
            <li>Day 2: Dinner</li>
            <li>Day 3: Breakfast</li>
            <li>Day 3: Lunch</li>
          </ul>

          <h3>Other ideas</h3>
          <ul>
            <li>Create insurance for the participants if the venue doesn&apos;t have it!</li>
          </ul>
        </section>

        {/* Section 13: Preparing the Venue */}
        <section id="preparing-venue" className="pt-70">
          <h2>13. Preparing the venue</h2>

          <p>
            The space sets the tone for the kickoff. The aim is to create an environment that feels
            open, welcoming, and free of distractions. When the space feels ready, participants feel
            ready too, and the hosts are free and able to be fully present.
          </p>

          <div className={styles.successFactors}>
            <h3>
              <i className="bx bx-check-circle" /> Success factors
            </h3>
            <h4>What does a successfully prepared venue look like?</h4>
            <ul>
              <li>The space feels warm, open, and playful even before people enter</li>
              <li>
                The venue is prepared with different participant needs in mind, such as:
                <ul>
                  <li>quiet reflection</li>
                  <li>eating, drinking and relaxing</li>
                  <li>connecting and chatting with others</li>
                  <li>being playing and having fun</li>
                </ul>
              </li>
              <li>
                The venue is safe: first aid available, emergency exits clear, the room free of
                hazards
              </li>
              <li>A visible #play14 sign</li>
              <li>Giveaways and materials have dedicated spots</li>
              <li>
                A flipchart, board, or wall is available for posting important information and
                updates
              </li>
              <li>There is space for coats, bags, and personal belongings</li>
              <li>The marketplace board is set up</li>
              <li>Bathrooms, kitchen, and water stations are clearly marked</li>
            </ul>
          </div>

          <h3>Marketplace board</h3>
          <p>The marketplace board is at the heart of each #play14 event.</p>

          <h4>Sections</h4>
          <ul>
            <li>(optional) Rules - Open space rules and #play14 code of conduct</li>
            <li>(optional) Event space map</li>
            <li>
              (optional) Upcoming activities - a space for people to store their proposals ahead of
              the marketplace
            </li>
            <li>The grid</li>
            <li>(optional) Completed activities</li>
            <li>(optional) Feedback and Kudos</li>
            <li>(optional) Notice board</li>
          </ul>

          <h4>Building it</h4>
          <ul>
            <li>Choose a central, large, appropriate wall to build it</li>
            <li>
              (optional) Use rolls of brown paper to form the backing of the board. Stick in place
              with LOW TACK masking tape to avoid damaging
            </li>
            <li>
              Separate your sections and grid with tape (masking tape or washi tape works best) or
              you can draw lines if using a whiteboard
            </li>
            <li>Title your sections</li>
          </ul>

          <h4>The grid</h4>
          <p>
            The grid shows spaces and timeboxes that form the agenda, which is refreshed and
            populated each day of the conference.
          </p>
          <ul>
            <li>
              Each cell of the grid is sized to the sticky note size you&apos;ll use for proposals
            </li>
            <li>
              <strong>Columns:</strong> Each column is a timebox in the event, beginning at the
              start and ending at the close of each day
              <ul>
                <li>Make these 1 hour: 45 mins + 15 mins (to move, refresh etc)</li>
                <li>Note: Encourage folk who need less to partner up</li>
                <li>Note: Encourage folk who need more to take 2+ slots</li>
                <li>The header in each column contains the beginning time of that timebox</li>
                <li>Include breakfast</li>
                <li>Include marketplace</li>
                <li>Include lunch</li>
                <li>Include dinner</li>
                <li>Include unstructured time, if there is any</li>
                <li>(Optional) Visualise the 15 min transition times</li>
              </ul>
            </li>
            <li>
              <strong>Rows:</strong> These are the event play spaces
              <ul>
                <li>
                  Include an indication of the max amount of people and its configuration (e.g.
                  open, tables and chairs, big table etc)
                </li>
                <li>Name your spaces (be playful!)</li>
                <li>
                  (Optional) Select a theme for the #play14 and give themed names to the
                  rooms/spaces
                </li>
              </ul>
            </li>
          </ul>

          <h4>Example proposal</h4>
          <p>Prepare an example proposal as demonstration:</p>
          <ul>
            <li>Include: Activity title (draw it and make it look great!)</li>
            <li>Include: Facilitator(s)</li>
            <li>Include: Energy level expected</li>
            <li>Include: Time needed</li>
          </ul>

          <div className={styles.checklistSection}>
            <h3>
              <i className="bx bx-list-check" /> Checklist
            </h3>
            <ul className={styles.checklist}>
              <li>
                Optional: If you plan to have food available for people from when they arrive, get
                it ready and set up
              </li>
              <li>Welcome spot is set up at the entrance</li>
              <li>Marketplace board set up</li>
              <li>Mark bathrooms, kitchen, and water points</li>
              <li>Flipchart or board for important information and updates ready</li>
              <li>Area for coats, bags, and personal items set up</li>
              <li>
                Tables or separate areas for giveaways, event materials (e.g. stickies, pens,
                paper), and loaned resources (e.g. games, cards etc. people bring along clearly
                labeled whom they belong to) set up
              </li>
              <li>Refreshments available</li>
              <li>Music is playing in the background</li>
            </ul>
          </div>
        </section>

        {/* Section 14: Arriving */}
        <section id="arriving" className="pt-70">
          <h2>14. Arriving</h2>

          <p>
            The first hour of #play14 is deceptively important. Though day one is short and light,
            the impressions formed here ripple through the whole conference. This is where
            participants shift from being strangers arriving at a venue to being part of a community
            about to explore and play together.
          </p>
          <p>
            A good arrival makes them feel reassured, welcomed, and at ease. It gives them
            orientation to the space, to the people around them, and to what tomorrow will bring.
            These small first impressions matter. When participants leave the evening already
            feeling a sense of connection, curiosity, and belonging, the main event the next day can
            start stronger and go deeper, faster.
          </p>

          <div className={styles.successFactors}>
            <h3>
              <i className="bx bx-check-circle" /> Success factors
            </h3>
            <h4>What does a successful arrival look like?</h4>
            <ul>
              <li>Participants are warmly greeted at the door by a host</li>
              <li>They know they have found the right place</li>
              <li>They know where to put their belongings</li>
              <li>They know where to find refreshments and bathrooms</li>
              <li>They know when the event kicks off</li>
              <li>They know what all the things they can do until it kicks off</li>
              <li>They know enough about the space</li>
              <li>Hosts have recorded whether people have turned up or not</li>
            </ul>
          </div>

          <div className={styles.checklistSection}>
            <h3>
              <i className="bx bx-list-check" /> Checklist
            </h3>
            <h4>Core things for hosting team to do:</h4>
            <ul className={styles.checklist}>
              <li>At least one host visible at the entrance to greet arrivals</li>
              <li>Clear, friendly signage confirming the event</li>
              <li>The space is fully set up before the first participants arrive</li>
              <li>Where to put their things is obvious and accessible</li>
              <li>Refreshments are available</li>
              <li>Bathrooms are clearly signposted and easy to find</li>
              <li>Name tags and giveaways (optional) are set up</li>
              <li>Each participant is ready for pre-kickoff</li>
              <li>Recorded who has and hasn&apos;t arrived</li>
            </ul>
          </div>

          <div className={styles.inspiration}>
            <h3>
              <i className="bx bx-bulb" /> Inspiration
            </h3>
            <h4>Some ideas that can make arriving brilliant:</h4>
            <ul>
              <li>
                Have music playing in the background (upbeat, celebratory, playful). Invite folk to
                add to the playlist (e.g. Spotify Jam)
              </li>
              <li>
                Add playful touches to the space, e.g. a welcome sign such as &ldquo;You made
                it!&rdquo;
              </li>
              <li>
                Make yourselves easy to spot - #play14 t-shirts, but with something else to
                distinguish you, e.g. a hat or a sash
              </li>
              <li>
                A simple visual cue such as a balloon, banner, or marker guiding people into the
                space
              </li>
              <li>Give them a brief, personal tour of the space</li>
              <li>Ask people to use a name tag</li>
              <li>
                Prepare a self-check-in for people to start doing the check in an autonomous way, so
                we don&apos;t need to have hosts to give everything. Use post-its to write a name
                and t-shirt sizes. When a person already finishes the check in (take everything
                needed), move their post-it to the place DONE.
              </li>
            </ul>
          </div>
        </section>

        {/* Section 15: Pre-Kickoff */}
        <section id="pre-kickoff" className="pt-70">
          <h2>15. Pre-kickoff</h2>

          <p>
            The time before kickoff can feel unstructured, but that is its strength. This is the
            hour where participants get their bearings, relax into the space, and begin connecting
            with one another. It is not about running activities or filling every moment. Instead,
            it is about creating the right conditions so that people can participate at the level
            that suits them, whether that means jumping straight into conversation, joining a game,
            or simply sitting back with a drink.
          </p>
          <p>
            When hosts shape this time well, participants begin to feel comfortable with the event,
            with each other, and with the spirit of #play14.
          </p>

          <div className={styles.successFactors}>
            <h3>
              <i className="bx bx-check-circle" /> Success factors
            </h3>
            <h4>What does a successful pre-kickoff look like?</h4>
            <ul>
              <li>
                Participants feel empowered to participate to the level that is right for them,
                whether quiet or social
              </li>
              <li>Everything is optional and unstructured, with no pressure to join in</li>
              <li>
                There is a balance of choice: enough things to do so no one is bored, but not so
                much that it feels overwhelming
              </li>
              <li>Everyone has had the chance to meet at least one other participant</li>
              <li>
                People have had enough time to feel comfortable and settled in the event space
              </li>
              <li>
                People have name tags and hosts can easily be identified if there are questions
              </li>
              <li>
                People can choose to participate in a range of light activities (optional, never
                mandatory) that offers plenty of choice without overwhelming - you could post some
                of these on the flipchart of the entrance as stickies
              </li>
            </ul>
          </div>

          <div className={styles.checklistSection}>
            <h3>
              <i className="bx bx-list-check" /> Checklist
            </h3>
            <h4>Core things for hosting team to do:</h4>
            <ul className={styles.checklist}>
              <li>A range of light activities for people to engage with are provided</li>
              <li>Hosts on hand to support</li>
            </ul>
          </div>

          <div className={styles.inspiration}>
            <h3>
              <i className="bx bx-bulb" /> Inspiration
            </h3>
            <h4>Activity ideas to make the pre-kickoff extra brilliant:</h4>
            <ul>
              <li>
                Pen pictures: paired interviews with sketches, creating playful portraits of
                participants
              </li>
              <li>
                Conversation prompt cards or &ldquo;big talk&rdquo; starters scattered on tables
              </li>
              <li>Board or parlor games available for spontaneous play</li>
              <li>Invite people to contribute to the music choices (e.g. Spotify Jam)</li>
              <li>A doodle wall or creative corner for people who prefer quiet activity</li>
              <li>
                A small list of &ldquo;lite tasks&rdquo; participants can help with to support the
                event setup (naming spaces, volunteering for small roles, name tags)
                <ul>
                  <li>
                    Example: Create a Kanban board with those tasks at the beginning. If people
                    arrive early they can help and support by taking some tasks.
                  </li>
                </ul>
              </li>
            </ul>
          </div>
        </section>

        {/* Section 16: Starting */}
        <section id="starting" className="pt-70">
          <h2>16. Starting</h2>

          <p>
            The start is when we officially begin, when we all come together for the first time and
            are welcomed to the event. Its purpose is to give a clear and inviting sense of what to
            expect: what #play14 is, how the conference will flow, and the values and ethos that
            guide us.
          </p>

          <div className={styles.successFactors}>
            <h3>
              <i className="bx bx-check-circle" /> Success factors
            </h3>
            <h4>What does a successful start look like?</h4>
            <ul>
              <li>Create and hold a space in which people feel respected, seen and safe</li>
              <li>Everyone knows who the hosts are</li>
              <li>
                People know:
                <ul>
                  <li>
                    Where the play spaces are, how they are configured, and how they are called
                  </li>
                  <li>What other spaces / facilities there are, and their intentions</li>
                  <li>The notice board etc</li>
                  <li>Access requirements, security, restrictions</li>
                  <li>
                    Rules (tidiness, noise, any other restrictions or agreements with the venue)
                  </li>
                  <li>Other expectations - fire alarms, doors open, doors shut etc</li>
                </ul>
              </li>
              <li>
                People understand what will happen tonight and what to expect tomorrow including
                refreshments and mealtimes are clearly communicated, so no one is distracted by
                hunger
              </li>
              <li>
                People know about the five core{" "}
                <a href="#open-space-principles">open space principles</a>
              </li>
              <li>
                People know about #play14&apos;s <a href="#code-of-conduct">code of conduct</a> (you
                could display it on a wall)
              </li>
              <li>
                People know how the marketplace works, how to propose a session and which elements
                they can include in this proposal the next morning
              </li>
              <li>People know what materials are available for their sessions</li>
              <li>
                People feel reassured that they are in good hands and that their needs have been
                anticipated
              </li>
              <li>
                You are able to get everyone&apos;s attention (e.g. hands up and be quiet scouting
                rule)
              </li>
            </ul>
          </div>

          <div className={styles.checklistSection}>
            <h3>
              <i className="bx bx-list-check" /> Checklist
            </h3>
            <h4>Core things for hosting team to do:</h4>
            <ul className={styles.checklist}>
              <li>Introduce yourselves</li>
              <li>Share essential orientation</li>
              <li>Introduce signals (scout rule or a gong etc)</li>
              <li>Explain the flow of the evening and tomorrow&apos;s outline</li>
              <li>Give a brief overview of the marketplace</li>
              <li>
                Encourage people to think about what they might pitch tomorrow and show where people
                can put them in advance. (Point out an example)
              </li>
            </ul>
          </div>

          <div className={styles.inspiration}>
            <h3>
              <i className="bx bx-bulb" /> Inspiration
            </h3>
            <h4>Some ideas to make starting brilliant:</h4>
            <ul>
              <li>
                Use a playful or creative way to introduce the hosting team (short fun fact, prop,
                or gesture)
              </li>
              <li>
                Give a simple orientation tour or let people explore the space in teams with a
                visual map of the venue or a game/challenge
              </li>
              <li>
                Include the wisdom of the crowd when you explain the marketplace and how to make a
                proposal
              </li>
              <li>
                Share the evening&apos;s flow as a story rather than a dry schedule: like an
                adventure or a journey with different islands/stations where you stop by altogether
                to explore them: marketplace, area of games etc.
              </li>
              <li>
                Use a symbolic action to set the tone (ringing a bell, lighting something, a
                collective cheer)
              </li>
              <li>
                Post a clear, visible timetable for tonight and tomorrow so no one is left guessing
              </li>
              <li>
                Share the open space principles in written, with emojis OR participants collect the
                open space principles together and possibly also: people share them in the languages
                that are present (tip: check how many languages are present and adapt the length of
                the details you share in all languages accordingly)
              </li>
            </ul>
          </div>

          <div className={styles.background}>
            <h3>
              <i className="bx bx-info-circle" /> #play14 background
            </h3>
            <p>#play14 was born from a simple but uncomfortable observation:</p>
            <p>
              Most teams are full of smart, capable people, yet they often struggle to collaborate,
              decide, and move forward effectively. Meetings drag on. Decisions get postponed.
              Change is discussed more than it is practiced.
            </p>
            <p>
              Instead of adding more frameworks, slides, or processes, #play14 took a different path
              — <strong>using play as a serious tool</strong>.
            </p>
            <p>
              The idea is straightforward: when people play together in a well-designed way, they
              lower their guards, think more clearly, and engage more honestly. Play becomes a
              shortcut to trust, learning, and action — not an escape from work, but a better way to
              do it.
            </p>
            <p>
              Over time, #play14 evolved into a collection of structured experiences that combine
              games, facilitation, and real-world challenges. These experiences are designed to help
              teams work on topics such as collaboration, leadership, decision-making,
              communication, and creativity.
            </p>
            <p>
              At its core, #play14 is not about winning or competing. It is about experimenting,
              reflecting, and learning together.
            </p>
            <p>
              The #play14 event is an invitation to step out of routine thinking, engage with others
              in a different way, and experience how play — when done intentionally — can lead to
              real insights and meaningful change.
            </p>
            <p>
              More information: <Link href="/about/story">Our story</Link> |{" "}
              <Link href="/about/values">Our values</Link> |{" "}
              <Link href="/about/format">Our format</Link>
            </p>
          </div>
        </section>

        {/* Section 17: Group Activities */}
        <section id="group-activities" className="pt-70">
          <h2>17. Group activities</h2>

          <p>
            After the kickoff, we play together! Group activities are short, playful warm ups,
            energisers, and games that get people moving, interacting, and connecting. They help
            participants step into the spirit of #play14, easing them into an engaged and
            participatory mindset. There are two important outcomes:
          </p>
          <ul>
            <li>
              First, to discover some things that connect. For example, realising that someone
              shares an interest makes future conversations easier to begin.
            </li>
            <li>
              Second, to gently nudge them out of their comfort zones, creating a bridge to the more
              serious and deeper games and activities to come.
            </li>
          </ul>

          <div className={styles.successFactors}>
            <h3>
              <i className="bx bx-check-circle" /> Success factors
            </h3>
            <h4>What does successful group activities look like?</h4>
            <ul>
              <li>
                <strong>Inclusivity:</strong> activities are accessible to everyone, balancing the
                needs of introverts and extroverts
              </li>
              <li>
                <strong>Space:</strong> the area is open, clear, and safe for movement
              </li>
              <li>
                <strong>Brevity:</strong> the section is clearly timeboxed to avoid burnout
              </li>
              <li>
                <strong>Connections:</strong> games help participants learn more about each other
                and form bonds
              </li>
              <li>
                <strong>Right to pass:</strong> people know they can opt out if uncomfortable, with
                no pressure
              </li>
              <li>
                <strong>Variety:</strong> many small activities rather than long ones, with varied
                facilitators where possible
              </li>
              <li>
                <strong>Movement:</strong> participants are on their feet, moving around the space,
                and waking up their brains
              </li>
              <li>
                <strong>Debrief:</strong> reflections are front-run by hosts to draw out learning
                and connect the activities to facilitation practice
              </li>
              <li>
                <strong>Meta:</strong> as this is a conference for facilitators, hosts name why a
                game is useful, when to use it, and share facilitation nuances
              </li>
              <li>
                <strong>Celebration:</strong> games end with applause or another shared gesture to
                mark the close
              </li>
              <li>
                <strong>Handing over:</strong> once the hosts have set the tone, participants are
                invited to share their own warm ups or energisers
              </li>
              <li>
                <strong>Recruitment:</strong> use this moment to find two volunteers comfortable /
                brave enough to kick off the conference marketplace tomorrow. One of them must be
                familiar with unconferences / open spaces.
              </li>
              <li>
                <strong>Scene setting:</strong> participants understand that after this section
                comes unstructured time to play, connect, or relax
              </li>
            </ul>
          </div>

          <div className={styles.checklistSection}>
            <h3>
              <i className="bx bx-list-check" /> Checklist
            </h3>
            <h4>Core things for hosting team to do:</h4>
            <ul className={styles.checklist}>
              <li>List of exercises prepared</li>
              <li>Timebox agreed</li>
              <li>The space cleared of obstacles and hazards</li>
              <li>Participants have the right to pass</li>
              <li>At least one moment of reflection or debrief built in</li>
              <li>Participants invited to lead one or two activities</li>
              <li>Two volunteers have been found to lead the marketplace on day 2</li>
            </ul>
          </div>
        </section>

        {/* Section 18: Open and Free Activities */}
        <section id="open-free-activities" className="pt-70">
          <h2>18. Open and free activities</h2>

          <p>
            The night is not over yet, but it is now important to transition from structured and
            planned into open and free. The role of the host moves from leading to holding the
            space, allowing participants to engage in the way that is right for them.
          </p>

          <div className={styles.successFactors}>
            <h3>
              <i className="bx bx-check-circle" /> Success factors
            </h3>
            <h4>What does a successful post group activities phase look like?</h4>
            <ul>
              <li>
                Participants are able to engage in whatever way feels right for them. The atmosphere
                allows people to rest, socialise, play, leave, refuel, think
              </li>
              <li>Everything is optional and unstructured, with no pressure to join in</li>
              <li>
                There is a balance of choice: enough things to do so no one is bored, but not so
                much that it feels overwhelming
              </li>
              <li>
                There is a clear sense of empowerment: participants know they can move, eat, play,
                or just sit without judgment
              </li>
              <li>Food and drink are available</li>
              <li>
                If the evening meal is in this stage, then timing of food should feel natural and
                considerate: people are neither left hungry nor interrupted mid-flow
              </li>
            </ul>
          </div>

          <div className={styles.checklistSection}>
            <h3>
              <i className="bx bx-list-check" /> Checklist
            </h3>
            <h4>Core things for hosting team to do:</h4>
            <ul className={styles.checklist}>
              <li>
                Provide a range of light activities for people to engage with (optional, never
                mandatory) that offers plenty of choice without overwhelming
              </li>
              <li>
                If needed rearrange the spaces to accommodate different participant needs such as
                offering options for quiet reflection, opportunities to connect and chat with
                others, and possibilities to engage in playful activities
              </li>
              <li>Make food and drink easily available, with clear timing communicated</li>
              <li>Signal clearly that everything is optional and self-directed</li>
              <li>
                Ensure there are enough cues (materials, games, props) to spark interaction without
                overwhelming
              </li>
              <li>Hosts remain available but step back, allowing participants to take the lead</li>
              <li>
                Provide visible information about when the venue will close in the evening and when
                it will reopen in the morning
              </li>
              <li>
                Share details for the next morning again: when the venue opens, whether breakfast
                will be available (and at what time), and when the marketplace will begin
              </li>
              <li>
                Hosts stay visible but do not over-structure, ensuring people feel supported but
                free
              </li>
            </ul>
          </div>

          <div className={styles.inspiration}>
            <h3>
              <i className="bx bx-bulb" /> Inspiration
            </h3>
            <h4>Some ideas to make open and free activities brilliant:</h4>
            <ul>
              <li>
                Match food style to intention: buffet or finger food for movement, sit-down meals
                for reflection and depth
              </li>
              <li>
                Create a &ldquo;quiet lounge&rdquo; with cushions, low lighting, or a doodle wall
                for those who need calm
              </li>
              <li>Offer conversation zones with prompt cards for deeper dialogue</li>
              <li>
                Have games and playful tools available for those who want to keep moving and
                laughing in smaller groups
              </li>
              <li>
                Place food in different spots to encourage movement and mixing, or serve a communal
                meal to strengthen bonds
              </li>
              <li>
                Use subtle signals to help people shift modes (e.g. dimming lights to mark the meal
                starting)
              </li>
              <li>
                Offer a podcast booth where people can share their thoughts on #play14 or respond to
                any other invitation you provide
              </li>
              <li>
                Conversation prompt cards or &ldquo;big talk&rdquo; starters scattered on tables
              </li>
              <li>
                Pen pictures: paired interviews with sketches, creating playful portraits of
                participants
              </li>
              <li>Board or parlor games available for spontaneous play</li>
              <li>A doodle wall or creative corner for people who prefer quiet activity</li>
            </ul>
          </div>
        </section>

        {/* PART 3: DURING THE DAY */}
        <div className={styles.partDivider}>
          <h2>Part 3: During the day</h2>
          <p>
            Guide for running the marketplace, facilitating game sessions, and managing meals
            throughout the event.
          </p>
        </div>

        {/* Section 19: Starting the day */}
        <section id="starting-day" className="pt-70">
          <h2>19. Starting the day</h2>

          <p>
            The marketplace is the beating heart of every #play14 event. It&apos;s where the energy
            of the day ignites, where facilitators pitch their games, and where participants choose
            their own adventure. As a host, your role is to facilitate this energy while keeping
            things flowing smoothly.
          </p>
          <p>
            The marketplace sets the tone for everything that follows. A well-run marketplace
            creates excitement and momentum; a rushed or disorganized one can leave people confused
            and hesitant. Strike the right balance between structure and spontaneity.
          </p>

          <h3>
            <i className="bx bx-run" /> Warmups
          </h3>
          <p>
            Start the day with a warmup activity. Warmups are essential for setting the right
            mood—they energize the group, break down initial barriers, and create a playful
            atmosphere. A good warmup reminds everyone that #play14 is about fun, learning, and
            connection.
          </p>
          <div className={styles.successFactors}>
            <h3>
              <i className="bx bx-check-circle" /> Success factors
            </h3>
            <h4>What makes a good warmup?</h4>
            <ul>
              <li>Gets everyone physically energized and mentally present</li>
              <li>Breaks down social barriers and creates a playful atmosphere</li>
              <li>Quick enough not to delay the marketplace (5-10 minutes maximum)</li>
              <li>Inclusive of all experience levels and physical abilities</li>
              <li>Sets a tone of experimentation and fun</li>
            </ul>
          </div>

          <h3>
            <i className="bx bx-user-plus" /> Welcome new players
          </h3>
          <p>
            Some participants may join on the second day, especially if the first evening was
            optional or if people couldn&apos;t make it. Take a moment to welcome newcomers, do a
            quick round of introductions, and help them feel included. They&apos;ll catch up quickly
            once the games begin.
          </p>

          <h3>
            <i className="bx bx-book-open" /> Explain the rules
          </h3>
          <p>
            Before the pitching begins, remind everyone of the three guiding frameworks that shape
            #play14:
          </p>
          <ul>
            <li>
              <strong>
                <Link href="#open-space-principles">Open space principles</Link>
              </strong>{" "}
              — The rules that make the unconference format work
            </li>
            <li>
              <strong>
                <Link href="#code-of-conduct">Code of conduct</Link>
              </strong>{" "}
              — Our commitment to creating a safe and inclusive space
            </li>
            <li>
              <strong>
                <Link href="#manifesto">Manifesto</Link>
              </strong>{" "}
              — The values that define what #play14 is and always will be
            </li>
          </ul>

          <h3>
            <i className="bx bx-note" /> How to create a game pitch
          </h3>
          <p>
            Explain how to write a clear and effective pitch on a large sticky note. A good pitch
            sticky should include:
          </p>
          <ul>
            <li>
              <strong>Game name</strong> — Clear and catchy
            </li>
            <li>
              <strong>Your name</strong> — So people know who&apos;s facilitating
            </li>
            <li>
              <strong>Duration</strong> — How long the session will take
            </li>
            <li>
              <strong>Number of players</strong> — Minimum and maximum if applicable
            </li>
            <li>
              <strong>Energy level</strong> — From quiet/reflective to super energized, so
              participants can choose what matches their mood
            </li>
            <li>
              <strong>Brief description</strong> — One sentence about what the game is about
            </li>
          </ul>
          <p>
            For more details on the marketplace format, see our{" "}
            <a href="https://play14.org/about/format" target="_blank" rel="noopener noreferrer">
              format page
            </a>
            .
          </p>

          <h3>
            <i className="bx bx-microphone" /> Pitching games
          </h3>
          <p>
            Once everyone is ready, invite facilitators to form a queue. Each person gets one minute
            to pitch their game to the group. Keep the energy high and the momentum flowing:
          </p>
          <ul>
            <li>
              <strong>One minute per pitch</strong> — Set a timer if needed, but keep it light and
              fun
            </li>
            <li>
              <strong>Fast but understandable</strong> — The goal is to intrigue people, not give
              them all the details
            </li>
            <li>
              <strong>Seamless flow</strong> — As soon as one facilitator finishes and sticks their
              session on the marketplace board, the next one begins
            </li>
            <li>
              <strong>Encourage enthusiasm</strong> — The more excited the facilitators are, the
              more excited the participants will be
            </li>
          </ul>

          <div className={styles.checklistSection}>
            <h3>
              <i className="bx bx-list-check" /> Checklist
            </h3>
            <h4>Hosting team responsibilities during pitches:</h4>
            <ul className={styles.checklist}>
              <li>Keep the energy high with applause and encouragement</li>
              <li>Gently remind facilitators of the one-minute timebox if needed</li>
              <li>Help facilitators stick their sessions on the marketplace board</li>
              <li>Manage the queue and keep things flowing</li>
              <li>Be ready to pitch your own games if you&apos;re facilitating</li>
            </ul>
          </div>

          <h3>
            <i className="bx bx-shuffle" /> Final marketplace reorganization
          </h3>
          <p>
            Once all pitches are complete, give everyone a few minutes to review the marketplace
            board. This is the last chance to optimize the schedule. Important: always ask
            facilitators for permission before moving their games—respect their autonomy and
            preferences.
          </p>
          <ul>
            <li>
              Move similar games together to create thematic blocks (with facilitator consent)
            </li>
            <li>Fill gaps in the schedule</li>
            <li>Adjust timing if needed (in collaboration with facilitators)</li>
            <li>Combine or split games based on interest (if facilitators agree)</li>
          </ul>

          <h3>
            <i className="bx bx-party" /> Game on!
          </h3>
          <p>
            With the marketplace set and participants buzzing with excitement, it&apos;s time to
            release everyone to their first sessions. Remind them of the room assignments, wish them
            well, and let the games begin. The energy you&apos;ve built in the marketplace will
            carry through the rest of the event.
          </p>

          <div className={styles.inspiration}>
            <h3>
              <i className="bx bx-bulb" /> Inspiration
            </h3>
            <h4>Warmup ideas that work well:</h4>
            <ul>
              <li>Rock-paper-scissors tournament — Fast, energizing, and gets everyone laughing</li>
              <li>Name game with gestures — Helps people remember each other&apos;s names</li>
              <li>
                Circle counting — Classic improv warmup that demonstrates collaboration and
                listening
              </li>
              <li>Human spectrogram — Physical positioning based on questions or preferences</li>
              <li>
                Quick energizer — Jump, stretch, shake it out to get blood flowing and minds alert
              </li>
            </ul>
          </div>
        </section>

        {/* Section 20: Game sessions */}
        <section id="game-sessions" className="pt-70">
          <h2>20. Game sessions</h2>

          <p>
            During the game sessions, your role as host shifts from active facilitation to
            supportive presence. You&apos;re no longer at the center of attention—the facilitators
            and participants are. Your job is to be available, helpful, and ready to solve problems
            without being intrusive.
          </p>
          <p>
            Think of yourself as the invisible infrastructure that keeps everything running
            smoothly. Participants should feel fully immersed in their games, confident that if they
            need something, you&apos;ll be there to help.
          </p>

          <h3>
            <i className="bx bx-time" /> Timebox reminders
          </h3>
          <p>
            While facilitators are responsible for managing their own timeboxes, you can help by
            providing gentle reminders between sessions. Use a noisemaker—like chimes or a gong—to
            signal when a session block is ending. Keep these signals respectful and non-disruptive;
            the goal is to help facilitators wrap up gracefully, not to interrupt the flow.
          </p>

          <h3>
            <i className="bx bx-map" /> Venue support
          </h3>
          <p>
            Be available to answer questions about the venue—where rooms are located, which spaces
            are available, whether a facilitator can move their session to a different room. Help
            participants navigate the space, especially if the venue is large or unfamiliar.
          </p>

          <h3>
            <i className="bx bx-package" /> Material support
          </h3>
          <p>
            Facilitators may need extra materials during their sessions. Be ready to provide
            markers, sticky notes, paper, tape, or other supplies. Restock common areas regularly so
            materials are always available. If a facilitator has a special request—like needing a
            flip chart moved or extra chairs—help make it happen quickly and quietly.
          </p>

          <h3>
            <i className="bx bx-smile" /> Being a good host
          </h3>
          <p>
            Your presence should be warm, welcoming, and helpful without being hovering. Check in
            periodically, but don&apos;t interrupt sessions. If someone needs help, they&apos;ll
            find you. If everything is running smoothly, let it flow.
          </p>

          <div className={styles.successFactors}>
            <h3>
              <i className="bx bx-check-circle" /> Success factors
            </h3>
            <h4>What does a good host look like during game sessions?</h4>
            <ul>
              <li>Available but not intrusive—participants know where to find you</li>
              <li>Resourceful and solutions-oriented when problems arise</li>
              <li>Calm and reassuring, even when things don&apos;t go as planned</li>
              <li>
                Respectful of facilitators&apos; autonomy—trust them to run their sessions well
              </li>
              <li>Quick to respond to needs without making participants feel like a burden</li>
            </ul>
          </div>
        </section>

        {/* Section 21: Lunch and dinners */}
        <section id="meals" className="pt-70">
          <h2>21. Lunch and dinners</h2>

          <p>
            Meals at #play14 are more than just fuel—they&apos;re opportunities for community
            building. Over lunch and dinner, participants relax, connect on a personal level, and
            share stories beyond the game sessions. Quality meals create a welcoming environment
            where people feel cared for and valued.
          </p>
          <p>
            Plan for variety, quantity, and accessibility. People have different dietary needs and
            preferences, and running out of food can dampen the event&apos;s energy. When in doubt,
            overestimate rather than underestimate.
          </p>

          <h3>
            <i className="bx bx-food-menu" /> Food and drinks
          </h3>
          <p>Provide a variety of food options that accommodate different dietary restrictions:</p>
          <div className="row">
            <div className="col-lg-6 col-md-12">
              <h4>Minimum</h4>
              <ul>
                <li>Main dishes with vegetarian and vegan options</li>
                <li>Gluten-free and allergen-friendly choices clearly labeled</li>
                <li>Fresh salads and vegetables</li>
                <li>Bread, rice, or other staples</li>
                <li>Sufficient quantity for all participants (with leftovers)</li>
              </ul>
            </div>
            <div className="col-lg-6 col-md-12">
              <h4>Ideas</h4>
              <ul>
                <li>Local specialties that showcase regional culture</li>
                <li>Themed meals that tie into the event (game-inspired dishes, etc.)</li>
                <li>Buffet-style service to give participants control over portions</li>
                <li>Desserts and treats for a special touch</li>
                <li>Family-style serving to encourage sharing and conversation</li>
              </ul>
            </div>
          </div>

          <h3>
            <i className="bx bx-coffee" /> Beverages
          </h3>
          <p>
            Beverages are just as important as food. Coffee is crucial—many participants are
            genuinely addicted—and quality matters. Don&apos;t skimp on the coffee.
          </p>
          <ul>
            <li>
              <strong>Coffee</strong> — High-quality coffee, available throughout the day (people
              are addicted, and you want happy, caffeinated participants)
            </li>
            <li>
              <strong>Tea</strong> — A good selection of teas for those who prefer it
            </li>
            <li>
              <strong>Water</strong> — Plenty of water, easily accessible in multiple locations
            </li>
            <li>
              <strong>Soft drinks</strong> — If possible, avoid commercial sodas; offer healthier or
              local alternatives instead
            </li>
            <li>
              <strong>Alcoholic beverages</strong> — This depends on the hosting team&apos;s
              preferences and local customs. Some events offer wine or beer with meals; others
              don&apos;t. Choose what feels right for your event.
            </li>
          </ul>

          <h3>
            <i className="bx bx-cookie" /> Snacks during breaks
          </h3>
          <p>
            Keep snacks available throughout the day—healthy options like fruit, nuts, and granola
            bars, plus energizing treats like chocolate. Place snacks in multiple locations around
            the venue to encourage movement and spontaneous conversations.
          </p>

          <h3>
            <i className="bx bx-leaf" /> Local and organic preference
          </h3>
          <p>
            Whenever possible, source food locally and choose organic options. Supporting local
            suppliers aligns with #play14&apos;s values of sustainability and community connection.
            It also often results in fresher, more flavorful food.
          </p>

          <div className={styles.successFactors}>
            <h3>
              <i className="bx bx-check-circle" /> Success factors
            </h3>
            <h4>What makes meals successful at #play14?</h4>
            <ul>
              <li>Abundant food—no one should leave hungry or worried about running out</li>
              <li>Variety that accommodates all dietary needs without segregating anyone</li>
              <li>Quality ingredients that show you care about participants&apos; well-being</li>
              <li>Easy access to drinks and snacks throughout the day</li>
              <li>
                A relaxed, communal atmosphere where people can sit, chat, and connect beyond games
              </li>
              <li>
                Support for local and sustainable food sources, reflecting #play14&apos;s values
              </li>
            </ul>
          </div>
        </section>

        {/* PART 4: ENDING THE EVENT */}
        <div className={styles.partDivider}>
          <h2>Part 4: Ending the event</h2>
          <p>
            The closing ceremony is as important as the opening—it&apos;s the last impression
            participants will have of your event.
          </p>
        </div>

        {/* Section 22: Retrospective */}
        <section id="retrospective" className="pt-70">
          <h2>22. Retrospective</h2>

          <p>
            The retrospective is the heart of the closing ceremony. It&apos;s as important as the
            opening, the moment that brings everything together. A thoughtful closing leaves people
            feeling grateful, connected, and eager to return next time.
          </p>
          <p>
            This isn&apos;t the time to rush. Give the closing ceremony the space it deserves, even
            if you&apos;re tired or behind schedule. The community will remember how you made them
            feel as they left.
          </p>

          <p>
            The retrospective is about people and experiences, not games. Yes, participants played
            amazing games, but what matters more is the connections they made, the insights they
            gained, and the moments that surprised them. Create space for participants to share what
            the event meant to them.
          </p>
          <p>
            Focus on celebration and gratitude. Thank the hosting team publicly—they worked hard to
            make this event happen. Acknowledge the facilitators who shared their games. Celebrate
            the participants who brought their energy and curiosity.
          </p>
          <p>
            End with a "see you next time" spirit. Remind everyone that #play14 is a global
            community, and there are events happening around the world. Invite them to stay
            connected, share their learnings, and consider hosting an event themselves someday.
          </p>

          <div className={styles.inspiration}>
            <h3>
              <i className="bx bx-bulb" /> Inspiration
            </h3>
            <h4>Retrospective formats that foster discussion and relatedness:</h4>
            <ul>
              <li>
                <strong>1-2-4-All</strong> — Individual reflection, then pairs, then groups of four,
                then sharing with everyone. Builds from personal to collective.
              </li>
              <li>
                <strong>Appreciation circle</strong> — Popcorn-style sharing of gratitude and
                appreciation for specific people or moments.
              </li>
              <li>
                <strong>TRIZ</strong> — Ask &ldquo;What could we do to ensure the worst possible
                event?&rdquo; Humor reveals insights.
              </li>
              <li>
                <strong>Constellation</strong> — Physical positioning to show how people are feeling
                or how connected they feel to the community.
              </li>
              <li>
                <strong>What, So What, Now What?</strong> — Simple structured reflection: What
                happened? What does it mean? What will I do next?
              </li>
              <li>
                <strong>Shift &amp; Share</strong> — Rotate through small groups, each sharing key
                moments or takeaways from the event.
              </li>
              <li>
                <strong>Open circle</strong> — Simply gather in a circle and invite people to share
                whatever is on their hearts—unstructured, authentic, and personal.
              </li>
            </ul>
            <p>
              Emphasize formats that create genuine dialogue and connection, not just reporting or
              listing. The goal is to deepen relationships and collective reflection.
            </p>
          </div>
        </section>

        {/* Section 23: Cleanup */}
        <section id="cleanup" className="pt-70">
          <h2>23. Cleanup</h2>

          <p>
            Invite the community to help with cleanup. Most participants will be happy to
            contribute—it&apos;s a way of giving back and extending the collaborative spirit of
            #play14. Provide clear guidance on what needs to be done: taking down posters,
            collecting materials, rearranging furniture, or tidying up common areas.
          </p>
          <p>
            Leave the venue better than you found it. This is a matter of respect for the space and
            the people who lent it to you. It also sets a good precedent for future #play14 events
            in that location.
          </p>
          <ul className={styles.checklist}>
            <li>Take down marketplace board and all posted materials</li>
            <li>Collect leftover supplies and pack them for future events</li>
            <li>Return furniture to its original configuration</li>
            <li>Dispose of trash and recycling responsibly</li>
            <li>Donate leftover food to local food banks or those in need if possible</li>
            <li>Clean up any spills or messes in the venue</li>
            <li>Return borrowed equipment or materials</li>
            <li>Do a final walkthrough to ensure nothing is left behind</li>
          </ul>
        </section>

        {/* Section 24: Saying goodbye */}
        <section id="goodbye" className="pt-70">
          <h2>24. Saying goodbye</h2>

          <p>
            Take time to say goodbye personally to as many participants as you can. These final
            moments are opportunities to thank people for coming, to hear their feedback, and to
            make sure they leave feeling valued. Wish them safe travels and remind them that the
            #play14 community is always here.
          </p>
          <p>
            Some participants may linger, reluctant to leave. That&apos;s a good sign—it means they
            felt connected and didn&apos;t want the experience to end. Let those moments happen
            naturally. The best events are the ones people don&apos;t want to leave.
          </p>
        </section>

        {/* PART 5: CLOSING THE EVENT */}
        <div className={styles.partDivider}>
          <h2>Part 5: Closing the event</h2>
          <p>Post-event work to close the loop, thank participants, and prepare for the future.</p>
        </div>

        {/* Section 25: Thank you to participants */}
        <section id="thank-you" className="pt-70">
          <h2>25. Thank you to participants</h2>

          <p>
            Send a thank-you message to all participants. Share key moments, photos, or highlights
            from the event. Let them know you appreciated their presence and contributions. This
            message keeps the connection alive and reminds people why #play14 matters.
          </p>
        </section>

        {/* Section 26: Host team retrospective */}
        <section id="team-retro" className="pt-70">
          <h2>26. Host team retrospective</h2>
          <p>
            Gather your hosting team for an internal retrospective. Reflect on what went well and
            what could be improved. Document lessons learned—these insights will help future hosts
            (including yourself, if you host again). Celebrate what you accomplished together.
          </p>
          <p>Some questions to guide your retrospective:</p>
          <ul>
            <li>What surprised us during the event?</li>
            <li>What would we do differently next time?</li>
            <li>What should we definitely repeat?</li>
            <li>What challenges did we face, and how did we handle them?</li>
            <li>How well did we work together as a team?</li>
          </ul>
        </section>

        {/* Section 27: Financial closeout */}
        <section id="financial" className="pt-70">
          <h2>27. Financial closeout</h2>

          <p>
            Complete the accounting for the event. Reconcile all expenses and revenue, finalize
            budgets, and ensure everything is documented. If there&apos;s a surplus, discuss with
            the #play14 network how to reinvest it into future events. If relevant, share financial
            transparency with participants to build trust and demonstrate that #play14 is truly
            non-profit.
          </p>
        </section>

        {/* Section 28: Publishing results */}
        <section id="publishing" className="pt-70">
          <h2>28. Publishing results</h2>
          <p>
            After the event, update the #play14 website with results and highlights. Access your
            event&apos;s admin page and navigate to the &ldquo;Actuals&rdquo; tab to publish
            financial and event data:
          </p>
          <ul>
            <li>
              <strong>Event summary</strong> — Number of participants, games played, overall
              atmosphere
            </li>
            <li>
              <strong>Financial actuals</strong> — Enter final revenue and expenses in the admin
              section&apos;s &ldquo;Actuals&rdquo; tab to maintain transparency and help future
              hosts plan their budgets
            </li>
            <li>
              <strong>Photo galleries</strong> — Link to photo albums or shared drives (with
              participants&apos; permission)
            </li>
            <li>
              <strong>Statistics</strong> — Attendance numbers, game counts, facilitator
              contributions
            </li>
            <li>
              <strong>Archived materials</strong> — Session descriptions, marketplace photos, or
              anything that might help future hosts
            </li>
          </ul>
          <p>
            Publishing results serves multiple purposes: it celebrates the event, documents it for
            the community&apos;s history, and provides inspiration and resources for future hosts.
            Financial transparency demonstrates #play14&apos;s non-profit values and helps future
            organizers plan their events.
          </p>

          <div className={styles.checklistSection}>
            <h3>
              <i className="bx bx-list-check" /> Checklist
            </h3>
            <h4>Post-event tasks for the hosting team:</h4>
            <ul className={styles.checklist}>
              <li>Send thank-you email to all participants</li>
              <li>Conduct internal host team retrospective</li>
              <li>Finalize accounting and budget reconciliation</li>
              <li>Upload photos and create photo gallery links</li>
              <li>Update event page on play14.org with results and statistics</li>
              <li>Share lessons learned with the global #play14 network</li>
              <li>Archive materials and documents for future reference</li>
              <li>Celebrate with your team—you did it!</li>
            </ul>
          </div>
        </section>

        {/* Section 29: Announce your next date */}
        <section id="announce-next" className="pt-70">
          <h2>29. Announce your next date</h2>
          <p>
            If your team is planning to host another event, announce the date before participants
            leave. This builds momentum and gives people something to look forward to.
          </p>
          <ul>
            <li>
              <strong>Timing</strong> — Announce during the closing ceremony or retrospective when
              energy is high
            </li>
            <li>
              <strong>Save the date</strong> — Even if details are limited, sharing the next date
              helps people plan ahead
            </li>
            <li>
              <strong>Team commitment</strong> — Make sure your hosting team is ready to commit
              before announcing publicly
            </li>
            <li>
              <strong>Create the event</strong> — Add it to play14.org so people can register their
              interest
            </li>
          </ul>
          <p>
            Early announcement builds anticipation and helps maintain community engagement between
            events.
          </p>
        </section>

        {/* APPENDIX */}
        <div className={styles.partDivider}>
          <h2>Appendix</h2>
        </div>

        {/* Section 30: Code of Conduct */}
        <section id="code-of-conduct" className="pt-70">
          <h2>30. Code of conduct</h2>
          <CodeOfConduct showCard={false} />
        </section>

        {/* Section 31: Open Space Principles */}
        <section id="open-space-principles" className="pt-70">
          <h2>31. Open space principles</h2>

          <p>There are some simple rules for participants.</p>

          <ul className={styles.principles}>
            <li>
              <strong>Whoever comes is the right people</strong>
              <p>
                As a facilitator, you should welcome anyone who has decided to join your session,
                and not be frustrated if you expect different people.
                <br />
                As a participant, you should be ready to collaborate with anyone.
              </p>
            </li>
            <li>
              <strong>Whenever it starts is the right time</strong>
              <p>
                As a facilitator, if you need some time to prepare, take it. Just think that people
                might get bored and go join another session. The best is to prepare anything in
                advance.
                <br />
                As a participant, there is nothing wrong with joining a session in progress. But
                respect the people who have already started, and try to jump in quietly.
              </p>
            </li>
            <li>
              <strong>Wherever it is, is the right place</strong>
              <p>
                You will be offered several spaces for your session. Choose the one that fits your
                needs as a facilitator or as a participant.
              </p>
            </li>
            <li>
              <strong>Whatever happens, is the only thing that could have</strong>
              <p>
                Be prepared to be surprised. Don&apos;t be annoyed if you get feedback. Don&apos;t
                be disappointed if it doesn&apos;t work. Try again if need be.
              </p>
            </li>
            <li>
              <strong>When it&apos;s over, it&apos;s over</strong>
              <p>
                As a facilitator, it&apos;s up to you to mind your timebox. The organizers will not
                do it for you. Keep in mind that the participants of your session might want to go
                to another session after yours and that the room might be reserved after. Feel free
                to continue in a different location with whoever is interested.
              </p>
            </li>
          </ul>

          <p className="pt-3">
            Learn more about the open space format on our{" "}
            <Link href="/about/format">format page</Link>.
          </p>
        </section>

        {/* Section 32: Manifesto */}
        <section id="manifesto" className="pt-70 pb-100">
          <h2>32. #play14 manifesto</h2>

          <p>
            The #play14 manifesto defines the values and principles that unite our global community.
            As a host, you&apos;re a guardian of these values—they guide how we organize events, how
            we treat each other, and what #play14 stands for. Share this manifesto with participants
            to remind them what makes #play14 special.
          </p>

          <p className="pt-3">
            <strong>#play14 is and always will be:</strong>
          </p>

          <ul className={styles.principles}>
            <li>
              <strong>A place to share knowledge &amp; practices</strong>
              <p>
                More than a place to sell services &amp; goods. We prioritize learning, exchange,
                and collaboration over commercialization. Facilitators share games to help others
                grow, not to promote products or services.
              </p>
            </li>
            <li>
              <strong>Open to all people or communities</strong>
              <p>
                With an interest in learning with fun. #play14 welcomes everyone, regardless of
                background, experience level, or professional role. If you&apos;re curious about
                learning through play, you belong here.
              </p>
            </li>
            <li>
              <strong>Focused on games &amp; activities in the physical world</strong>
              <p>
                More than in the virtual world. While we embrace technology when it enhances
                connection, #play14 is fundamentally about face-to-face interaction, tactile
                experiences, and being present with each other in shared physical spaces.
              </p>
            </li>
            <li>
              <strong>An unconference</strong>
              <p>
                Based on the Open Space Technology format. Participants co-create the agenda,
                facilitators propose sessions in the marketplace, and everyone follows the Law of
                Two Feet. The structure emerges from the community, not from a predetermined
                schedule.
              </p>
            </li>
            <li>
              <strong>Non-profit</strong>
              <p>
                Which means that when we do make a profit on a given event, we reinvest everything
                into the next. #play14 exists to serve the community, not to generate revenue.
                Financial transparency and reinvestment keep us aligned with this value.
              </p>
            </li>
          </ul>

          <p className="pt-3">
            These principles aren&apos;t just aspirations—they&apos;re commitments. When you host a
            #play14 event, you&apos;re carrying forward this legacy and ensuring that #play14
            remains true to its roots.
          </p>
        </section>

        {/* Closing */}
        <section className="pt-70 pb-100">
          <p>
            By following this guide, you&apos;ll be well on your way to hosting a successful #play14
            event!
          </p>
        </section>
      </div>
    </>
  )
}
