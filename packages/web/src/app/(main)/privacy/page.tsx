import Page from "@/components/layout/page"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Privacy Policy",
}

export default function PrivacyPolicy() {
  return (
    <Page name="Privacy Policy">
      <div className="centered">
        <p>Last update on January 2025</p>
      </div>
      <div className="container">
        <div className="pt-5">
          <h2>1. Introduction</h2>
          <p>
            At #play14, we respect your privacy and are committed to protecting
            your personal information. This Privacy Policy outlines how we
            collect, use, and disclose information about you when you visit our
            website (the &quot;Site&quot;), purchase tickets, participate in our events,
            and how we comply with the GDPR.
          </p>
        </div>
        <div className="pt-5">
          <h2>2. Collection of Personal Information</h2>
          <p>
            We may collect personal information from you when you use our Site,
            register for an event, purchase tickets, or contact us. The personal
            information we may collect includes:
          </p>
          <ul>
            <li><strong>Account Information:</strong> Name, email address, password (encrypted)</li>
            <li><strong>Player Profile:</strong> Name, company, tagline, biography, website, social media links, location, avatar photo</li>
            <li><strong>Ticket Purchase Information:</strong> For each attendee: first name, last name, email address, t-shirt size preference, food preferences or allergies</li>
            <li><strong>Payment Information:</strong> Processed securely through Stripe; we do not store credit card details</li>
            <li><strong>Event Participation:</strong> Events attended, hosted, or mentored</li>
          </ul>
        </div>
        <div className="pt-5">
          <h2>3. Legal Basis for Processing Personal Information</h2>
          <p>
            We process your personal information on the following legal bases:
          </p>
          <p>
            <ul>
              <li>
                To perform a contract with you, such as providing you with
                access to the event and information you request.
              </li>
              <li>
                To comply with legal obligations, such as responding to legal
                process or in order to comply with applicable laws, regulations,
                and legal requests.
              </li>
              <li>
                For our legitimate interests, such as improving our Site and
                services, and communicating with you about our events.
              </li>
            </ul>
          </p>
        </div>
        <div className="pt-5">
          <h2>4. Use of Personal Information</h2>
          <p>
            We use your personal information to:
          </p>
          <ul>
            <li>Process ticket purchases and deliver tickets electronically</li>
            <li>Create and manage your player profile</li>
            <li>Provide event-related services (such as ordering t-shirts and catering)</li>
            <li>Communicate with you about events you&apos;ve registered for</li>
            <li>Send invitation emails to new attendees with their ticket information</li>
            <li>Improve our Site and services</li>
            <li>Conduct internal auditing, data analysis, and research</li>
          </ul>
        </div>
        <div className="pt-5">
          <h2>5. Photo and Video Consent</h2>
          <p>
            During #play14 events, we take photographs and record videos for promotional and
            documentation purposes. When purchasing tickets, each attendee must provide explicit
            consent to being photographed and filmed during the event.
          </p>
          <p>
            <strong>What we record:</strong> Photos and videos of activities, workshops, group
            sessions, and participants during #play14 events.
          </p>
          <p>
            <strong>How we use this content:</strong>
          </p>
          <ul>
            <li>Publishing on the #play14 website (play14.org)</li>
            <li>Sharing on our social media channels</li>
            <li>Promotional materials for future events</li>
            <li>Event reports and documentation</li>
          </ul>
          <p>
            <strong>Consent tracking:</strong> Your photo/video consent is recorded per event with
            a timestamp. This consent is a mandatory requirement for attendance due to the open
            and collaborative nature of #play14 events.
          </p>
          <p>
            <strong>Withdrawing consent:</strong> You may withdraw your consent at any time by
            contacting the event organizers. However, please note that:
          </p>
          <ul>
            <li>Withdrawal does not affect the lawfulness of processing before withdrawal</li>
            <li>We may not be able to remove you from materials already published or shared</li>
            <li>Withdrawal may affect your ability to attend the event</li>
          </ul>
        </div>
        <div className="pt-5">
          <h2>6. Disclosure of Personal Information</h2>
          <p>
            We may disclose your personal information to the following parties:
          </p>
          <ul>
            <li>
              <strong>Event Organizers:</strong> Local organizing teams receive attendee information
              (name, email, t-shirt size, food preferences) to facilitate event logistics. Each
              event is organized by a volunteer team in the respective location.
            </li>
            <li>
              <strong>Payment Processors:</strong> Stripe processes payment transactions securely.
              Please refer to <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer">Stripe&apos;s Privacy Policy</a> for
              details on how they handle your data.
            </li>
            <li>
              <strong>Service Providers:</strong> Third-party providers who help us operate our
              Site, send emails, and manage events.
            </li>
            <li>
              <strong>Legal Requirements:</strong> When required by law or in response to legal
              process.
            </li>
          </ul>
        </div>
        <div className="pt-5">
          <h2>7. Cookies and Other Tracking Technologies</h2>
          <p>
            We use cookies and other tracking technologies to collect
            information about your use of our Site. This information helps us
            understand how our Site is being used and how we can improve it.
          </p>
        </div>
        <div className="pt-5">
          <h2>8. Security</h2>
          <p>
            We take reasonable steps to protect your personal information from
            unauthorized access, use, and disclosure. This includes:
          </p>
          <ul>
            <li>Encrypting passwords and sensitive data</li>
            <li>Using secure HTTPS connections</li>
            <li>Processing payments through PCI-compliant providers (Stripe)</li>
            <li>Limiting access to personal data to authorized personnel only</li>
          </ul>
          <p>
            However, no security measure is 100% effective, and we cannot guarantee the absolute
            security of your personal information.
          </p>
        </div>
        <div className="pt-5">
          <h2>9. Data Retention</h2>
          <p>
            We will retain your personal information for as long as necessary to
            fulfill the purpose for which it was collected, or as required by
            law. Specifically:
          </p>
          <ul>
            <li><strong>Player profiles:</strong> Retained until you request deletion</li>
            <li><strong>Ticket purchase records:</strong> Retained for legal and accounting purposes (typically 7 years)</li>
            <li><strong>Consent records:</strong> Retained for compliance documentation</li>
            <li><strong>Event attendance history:</strong> Retained as part of the #play14 community records</li>
          </ul>
        </div>
        <div className="pt-5">
          <h2>10. Player Profiles</h2>
          <p>
            When you purchase tickets or attend events, a player profile may be created on the
            #play14 platform. This profile:
          </p>
          <ul>
            <li>Stores your default preferences (t-shirt size, food preferences) for future events</li>
            <li>Tracks your event attendance history within the #play14 community</li>
            <li>Can be claimed and managed by creating an account on our Site</li>
            <li>May be visible to other community members (name and attendance)</li>
          </ul>
          <p>
            If a profile is created for you by someone else purchasing a ticket on your behalf,
            you will receive an invitation email to claim and manage your profile.
          </p>
        </div>
        <div className="pt-5">
          <h2>11. Your Rights under the GDPR</h2>
          <p>
            As a data subject, you have the following rights under the GDPR:
          </p>
          <ul>
            <li><strong>Right of access:</strong> Request a copy of your personal information</li>
            <li><strong>Right to rectification:</strong> Correct inaccurate or incomplete data</li>
            <li><strong>Right to erasure:</strong> Request deletion of your personal information</li>
            <li><strong>Right to restrict processing:</strong> Limit how we use your data</li>
            <li><strong>Right to object:</strong> Object to processing based on legitimate interests</li>
            <li><strong>Right to data portability:</strong> Receive your data in a structured format</li>
            <li><strong>Right to withdraw consent:</strong> Withdraw consent at any time (e.g., photo consent)</li>
          </ul>
          <p>
            To exercise any of these rights, please contact us at{" "}
            <a href="mailto:team@play14.org">team@play14.org</a> or contact the organizers of the
            specific event you attended.
          </p>
        </div>
        <div className="pt-5">
          <h2>12. Changes to Privacy Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. The updated
            Privacy Policy will be posted on our Site, and the date of the last
            update will be indicated at the top of this page.
          </p>
        </div>
        <div className="pt-5">
          <h2>13. Contact Us</h2>
          <p>
            If you have any questions or concerns about this Privacy Policy,
            please contact us at{" "}
            <a href="mailto:team@play14.org">team@play14.org</a>.
          </p>
          <p>
            For event-specific inquiries, please contact the local organizing team through the
            event page on our website.
          </p>
        </div>
        <div className="pt-5 pb-100">
          <h2>14. Governing Law</h2>
          <p>
            This Privacy Policy shall be governed by and construed in accordance
            with the laws applicable in Luxembourg. For data processing related to specific
            events, the laws of the country where the event is organized may also apply.
          </p>
        </div>
      </div>
    </Page>
  )
}
