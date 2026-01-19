import Page from "@/components/layout/page"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "General Terms and Conditions of Sale",
}

export default function TermsOfSale() {
  return (
    <Page name="General Terms and Conditions of Sale">
      <div className="container">
        <p className="pt-70">
          These General Terms and Conditions of Sale (&quot;Terms of Sale&quot;) govern the purchase
          of tickets for #play14 events (the &quot;Events&quot;) through our website at
          https://play14.org (the &quot;Site&quot;). By purchasing a ticket, you agree to be bound
          by these Terms of Sale. Please read them carefully before completing your purchase.
        </p>

        <div className="pt-5">
          <h2>1. Scope and Definitions</h2>
          <p>
            These Terms of Sale apply to all ticket purchases made through our online ticketing
            system. In these Terms of Sale:
          </p>
          <ul>
            <li>&quot;Event&quot; means a #play14 unconference organized in a specific location</li>
            <li>&quot;Ticket&quot; means the right to attend a specific Event</li>
            <li>
              &quot;Purchaser&quot; means the person who completes the ticket purchase transaction
            </li>
            <li>
              &quot;Attendee&quot; means the person who will attend the Event using a purchased
              Ticket
            </li>
            <li>&quot;Organizer&quot; means the local organizing team responsible for the Event</li>
          </ul>
        </div>

        <div className="pt-5">
          <h2>2. Ticket Purchase Process</h2>
          <p>To purchase tickets, you must:</p>
          <ul>
            <li>Create an account or sign in to an existing account on the Site</li>
            <li>Select the Event you wish to attend</li>
            <li>Choose the number and type of tickets</li>
            <li>Provide attendee information for each ticket holder</li>
            <li>Accept these Terms of Sale, the Privacy Policy, and the Terms of Service</li>
            <li>Complete payment through our payment processor (Stripe)</li>
          </ul>
          <p>
            A confirmation email will be sent to the Purchaser and each Attendee upon successful
            payment. Each Attendee will receive their unique ticket code.
          </p>
        </div>

        <div className="pt-5">
          <h2>3. Pricing and Payment</h2>
          <p>
            All ticket prices are displayed in the local currency of the Event and include
            applicable taxes unless otherwise stated. Payment is processed securely through Stripe.
            We accept major credit cards (Visa, MasterCard, American Express) and other payment
            methods supported by Stripe in your region.
          </p>
          <p>
            The price displayed at the time of purchase is final. We reserve the right to modify
            prices at any time, but changes will not affect orders that have already been confirmed.
          </p>
        </div>

        <div className="pt-5">
          <h2>4. Ticket Delivery</h2>
          <p>Tickets are delivered electronically. Upon successful payment:</p>
          <ul>
            <li>The Purchaser receives a confirmation email with all ticket details</li>
            <li>Each Attendee receives their individual ticket with a unique code</li>
            <li>New Attendees who do not have an account receive an invitation to create one</li>
          </ul>
          <p>
            Tickets can be accessed at any time through your account on the Site. Please ensure the
            email addresses provided are correct, as we cannot be held responsible for non-delivery
            due to incorrect email addresses.
          </p>
        </div>

        <div className="pt-5">
          <h2>5. Right of Withdrawal</h2>
          <p>
            According to applicable consumer protection laws, you may have a right to withdraw from
            a purchase within 14 days without giving any reason. However, please note that:
          </p>
          <ul>
            <li>
              For leisure events with a specific date, the right of withdrawal may not apply once
              the service has been fully performed or the Event has taken place
            </li>
            <li>
              By purchasing a ticket, you expressly consent to the Event being scheduled for a
              specific date, and you acknowledge that the right of withdrawal may be limited
              accordingly
            </li>
          </ul>
          <p>
            To exercise your right of withdrawal (where applicable), please contact the Event
            organizers using the contact information provided in your confirmation email.
          </p>
        </div>

        <div className="pt-5">
          <h2>6. Refund Policy</h2>
          <p>
            By default, all ticket sales are final. Refunds may be granted in the following
            circumstances:
          </p>
          <ul>
            <li>
              <strong>Event Cancellation:</strong> If an Event is cancelled by the Organizers, you
              will receive a full refund of the ticket price
            </li>
            <li>
              <strong>Event Rescheduling:</strong> If an Event is rescheduled and you cannot attend
              the new date, you may request a refund
            </li>
            <li>
              <strong>Exceptional Circumstances:</strong> The Organizers may, at their sole
              discretion, grant refunds in exceptional circumstances on a case-by-case basis
            </li>
          </ul>
          <p>
            Refunds will be processed to the original payment method. Please allow 5-10 business
            days for the refund to appear on your statement.
          </p>
        </div>

        <div className="pt-5">
          <h2>7. Attendee Information and Data Collection</h2>
          <p>When purchasing tickets, you must provide information for each Attendee, including:</p>
          <ul>
            <li>First name and last name</li>
            <li>Email address</li>
            <li>T-shirt size preference (optional)</li>
            <li>Food preferences or allergies (optional)</li>
            <li>Photo and video consent (required)</li>
          </ul>
          <p>This information is collected to:</p>
          <ul>
            <li>Provide personalized event materials (such as t-shirts)</li>
            <li>Accommodate dietary requirements during the Event</li>
            <li>Send event-related communications to Attendees</li>
            <li>Verify attendance at check-in</li>
          </ul>
          <p>
            For detailed information about how we process personal data, please refer to our{" "}
            <a href="/privacy">Privacy Policy</a>.
          </p>
        </div>

        <div className="pt-5">
          <h2>8. Photo and Video Consent</h2>
          <p>
            During #play14 Events, we take photographs and record videos for promotional and
            documentation purposes. These materials may be published on:
          </p>
          <ul>
            <li>The #play14 website (play14.org)</li>
            <li>Our social media channels</li>
            <li>Promotional materials for future events</li>
            <li>Event reports and documentation</li>
          </ul>
          <p>
            <strong>
              By purchasing a ticket, each Attendee must consent to being photographed and filmed
              during the Event.
            </strong>{" "}
            This consent is a mandatory requirement for attendance, as the open and collaborative
            nature of #play14 events makes it impractical to exclude specific individuals from group
            photos and videos.
          </p>
          <p>
            You may withdraw your consent at any time by contacting the Event organizers. However,
            please note that:
          </p>
          <ul>
            <li>
              Withdrawal of consent does not affect the lawfulness of processing based on consent
              before its withdrawal
            </li>
            <li>
              We may not be able to remove you from materials that have already been published or
              shared with third parties
            </li>
            <li>Withdrawal of consent may affect your ability to attend the Event</li>
          </ul>
        </div>

        <div className="pt-5">
          <h2>9. Player Profiles</h2>
          <p>
            When you purchase tickets, a player profile may be created for each Attendee on the
            #play14 platform. This profile:
          </p>
          <ul>
            <li>Stores default preferences (t-shirt size, food preferences) for future events</li>
            <li>Tracks event attendance history</li>
            <li>Can be claimed and managed by the Attendee through account creation</li>
          </ul>
          <p>
            Attendees who do not have an existing account will receive an invitation email to create
            one and claim their player profile.
          </p>
        </div>

        <div className="pt-5">
          <h2>10. Event Admission and Rules</h2>
          <p>Tickets grant access to the specified Event only. By attending, you agree to:</p>
          <ul>
            <li>Follow the Event&apos;s code of conduct</li>
            <li>Comply with instructions from the Organizers</li>
            <li>Respect other participants and venue rules</li>
            <li>Not engage in any prohibited conduct as outlined in our Terms of Service</li>
          </ul>
          <p>
            The Organizers reserve the right to refuse entry or remove any Attendee who violates
            these rules, without refund.
          </p>
        </div>

        <div className="pt-5">
          <h2>11. Limitation of Liability</h2>
          <p>To the fullest extent permitted by applicable law:</p>
          <ul>
            <li>#play14 events are organized by volunteer teams and are non-profit in nature</li>
            <li>
              We are not liable for any indirect, incidental, special, or consequential damages
              arising from your attendance at an Event
            </li>
            <li>Our total liability is limited to the amount paid for your ticket</li>
            <li>
              We are not responsible for personal belongings, injuries, or any incidents during the
              Event beyond our reasonable control
            </li>
          </ul>
        </div>

        <div className="pt-5">
          <h2>12. Changes to Events</h2>
          <p>
            We reserve the right to make changes to Event programs, speakers, activities, venues,
            and schedules. While we make every effort to deliver the Event as advertised, we cannot
            guarantee that all aspects of the Event will remain unchanged.
          </p>
          <p>
            In case of significant changes, we will notify ticket holders via email. If you are
            unable to attend due to changes, please contact the Organizers to discuss options.
          </p>
        </div>

        <div className="pt-5">
          <h2>13. Contact Information</h2>
          <p>
            For questions or concerns regarding your ticket purchase, please contact the Event
            organizers using the contact information provided in your confirmation email or on the
            Event page on our website.
          </p>
          <p>
            For general inquiries about #play14, please visit our website at{" "}
            <a href="https://play14.org">play14.org</a>.
          </p>
        </div>

        <div className="pt-5 pb-100">
          <h2>14. Governing Law</h2>
          <p>
            These Terms of Sale shall be governed by and construed in accordance with the laws of
            the country where the Event is organized. Any disputes arising from these Terms of Sale
            shall be subject to the exclusive jurisdiction of the courts in that country.
          </p>
          <p>
            <em>Last updated: January 2025</em>
          </p>
        </div>
      </div>
    </Page>
  )
}
