import type { Schema, Struct } from '@strapi/strapi';

export interface AttendeeAttendeeInfo extends Struct.ComponentSchema {
  collectionName: 'components_attendee_attendee_info';
  info: {
    description: 'Per-ticket attendee information for events';
    displayName: 'Attendee Info';
    icon: 'user';
  };
  attributes: {
    email: Schema.Attribute.Email & Schema.Attribute.Required;
    firstName: Schema.Attribute.String & Schema.Attribute.Required;
    foodPreferences: Schema.Attribute.Text;
    lastName: Schema.Attribute.String & Schema.Attribute.Required;
    photoConsent: Schema.Attribute.Boolean &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<false>;
    photoConsentTimestamp: Schema.Attribute.DateTime;
    tshirtSize: Schema.Attribute.Enumeration<
      ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'none']
    > &
      Schema.Attribute.DefaultTo<'none'>;
  };
}

export interface ContactSocialNetwork extends Struct.ComponentSchema {
  collectionName: 'components_contact_social_networks';
  info: {
    description: '';
    displayName: 'SocialNetwork';
    icon: 'address-card';
  };
  attributes: {
    socialNetworkType: Schema.Attribute.Enumeration<
      [
        'Twitter',
        'LinkedIn',
        'Facebook',
        'Youtube',
        'Instagram',
        'Xing',
        'Email',
        'Website',
        'Wikipedia',
        'Vimeo',
        'Other',
      ]
    >;
    url: Schema.Attribute.String;
  };
}

export interface DefaultHistoryItem extends Struct.ComponentSchema {
  collectionName: 'components_default_history_items';
  info: {
    description: '';
    displayName: 'HistoryItem';
  };
  attributes: {
    additionalText: Schema.Attribute.String;
    date: Schema.Attribute.Date & Schema.Attribute.Required;
    dateFormat: Schema.Attribute.Enumeration<['Year', 'Month', 'Day']>;
    description: Schema.Attribute.RichText &
      Schema.Attribute.Required &
      Schema.Attribute.CustomField<
        'plugin::ckeditor5.CKEditor',
        {
          preset: 'defaultHtml';
        }
      >;
    image: Schema.Attribute.Media<'images'> & Schema.Attribute.Required;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface EventsMedia extends Struct.ComponentSchema {
  collectionName: 'components_events_media';
  info: {
    displayName: 'Media';
    icon: 'photo-video';
  };
  attributes: {
    mediaType: Schema.Attribute.Enumeration<['Photos', 'Videos']> &
      Schema.Attribute.Required;
    url: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface EventsSponsorship extends Struct.ComponentSchema {
  collectionName: 'components_events_sponsorships';
  info: {
    description: '';
    displayName: 'Sponsorship';
    icon: 'address-book';
  };
  attributes: {
    category: Schema.Attribute.String & Schema.Attribute.Required;
    sponsors: Schema.Attribute.Relation<'oneToMany', 'api::sponsor.sponsor'>;
  };
}

export interface EventsTimeSlots extends Struct.ComponentSchema {
  collectionName: 'components_events_time_slots';
  info: {
    description: '';
    displayName: 'Timeslots';
    icon: 'stopwatch';
  };
  attributes: {
    description: Schema.Attribute.String & Schema.Attribute.Required;
    time: Schema.Attribute.Time & Schema.Attribute.Required;
  };
}

export interface EventsTimetable extends Struct.ComponentSchema {
  collectionName: 'components_events_timetables';
  info: {
    description: '';
    displayName: 'Timetable';
    icon: 'calendar';
  };
  attributes: {
    day: Schema.Attribute.Enumeration<
      [
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
        'Sunday',
      ]
    > &
      Schema.Attribute.Required;
    description: Schema.Attribute.String & Schema.Attribute.Required;
    timeslots: Schema.Attribute.Component<'events.time-slots', true> &
      Schema.Attribute.Required;
  };
}

export interface GamesRatings extends Struct.ComponentSchema {
  collectionName: 'components_games_ratings';
  info: {
    description: '';
    displayName: 'Ratings';
  };
  attributes: {
    connection: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          max: 5;
          min: 1;
        },
        number
      >;
    energy: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          max: 5;
          min: 1;
        },
        number
      >;
    silliness: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          max: 5;
          min: 1;
        },
        number
      >;
  };
}

export interface LocationAddress extends Struct.ComponentSchema {
  collectionName: 'components_location_addresses';
  info: {
    description: '';
    displayName: 'Address';
    icon: 'map-pin';
  };
  attributes: {
    area: Schema.Attribute.String;
    city: Schema.Attribute.String & Schema.Attribute.Required;
    postalCode: Schema.Attribute.String;
    street: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface RegistrationRegistration extends Struct.ComponentSchema {
  collectionName: 'components_registration_registrations';
  info: {
    description: '';
    displayName: 'Registration';
    icon: 'info-circle';
  };
  attributes: {
    link: Schema.Attribute.String;
    widgetCode: Schema.Attribute.Text;
  };
}

export interface ReportingFinance extends Struct.ComponentSchema {
  collectionName: 'components_reporting_finances';
  info: {
    description: '';
    displayName: 'Finance';
    icon: 'briefcase';
  };
  attributes: {
    destination: Schema.Attribute.String & Schema.Attribute.Required;
    expenses: Schema.Attribute.Decimal & Schema.Attribute.Required;
    result: Schema.Attribute.Enumeration<['Profit', 'Loss']> &
      Schema.Attribute.Required;
    resultAmount: Schema.Attribute.Decimal & Schema.Attribute.Required;
    revenue: Schema.Attribute.Decimal & Schema.Attribute.Required;
  };
}

export interface SharedDictionary extends Struct.ComponentSchema {
  collectionName: 'components_shared_dictionaries';
  info: {
    description: '';
    displayName: 'Dictionary';
  };
  attributes: {
    key: Schema.Attribute.String & Schema.Attribute.Required;
    value: Schema.Attribute.Text & Schema.Attribute.Required;
  };
}

export interface SharedList extends Struct.ComponentSchema {
  collectionName: 'components_shared_lists';
  info: {
    displayName: 'List';
  };
  attributes: {
    value: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface SharedMetaSocial extends Struct.ComponentSchema {
  collectionName: 'components_shared_meta_socials';
  info: {
    displayName: 'metaSocial';
    icon: 'project-diagram';
  };
  attributes: {
    description: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 65;
      }>;
    image: Schema.Attribute.Media<'images' | 'files' | 'videos'>;
    socialNetwork: Schema.Attribute.Enumeration<['Facebook', 'Twitter']> &
      Schema.Attribute.Required;
    title: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 60;
      }>;
  };
}

export interface SharedSeo extends Struct.ComponentSchema {
  collectionName: 'components_shared_seos';
  info: {
    displayName: 'seo';
    icon: 'search';
  };
  attributes: {
    canonicalURL: Schema.Attribute.String;
    keywords: Schema.Attribute.Text;
    metaDescription: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 160;
        minLength: 50;
      }>;
    metaImage: Schema.Attribute.Media<'images' | 'files' | 'videos'> &
      Schema.Attribute.Required;
    metaRobots: Schema.Attribute.String;
    metaSocial: Schema.Attribute.Component<'shared.meta-social', true>;
    metaTitle: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 60;
      }>;
    metaViewport: Schema.Attribute.String;
    structuredData: Schema.Attribute.JSON;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'attendee.attendee-info': AttendeeAttendeeInfo;
      'contact.social-network': ContactSocialNetwork;
      'default.history-item': DefaultHistoryItem;
      'events.media': EventsMedia;
      'events.sponsorship': EventsSponsorship;
      'events.time-slots': EventsTimeSlots;
      'events.timetable': EventsTimetable;
      'games.ratings': GamesRatings;
      'location.address': LocationAddress;
      'registration.registration': RegistrationRegistration;
      'reporting.finance': ReportingFinance;
      'shared.dictionary': SharedDictionary;
      'shared.list': SharedList;
      'shared.meta-social': SharedMetaSocial;
      'shared.seo': SharedSeo;
    }
  }
}
