DELETE FROM components_contact_social_networks;
DELETE FROM components_events_media;
DELETE FROM components_events_sponsorships_sponsors_links;
DELETE FROM components_events_sponsorships;
DELETE FROM components_events_timetables_components;
DELETE FROM components_events_time_slots;
DELETE FROM components_events_timetables;
DELETE FROM components_location_addresses;
DELETE FROM components_registration_registrations;

DELETE FROM players_events_links;
DELETE FROM events_hosts_links;
DELETE FROM events_localizations_links;
DELETE FROM events_location_links;
DELETE FROM events_mentors_links;
DELETE FROM events_venue_links;

DELETE FROM events;
DELETE FROM players;
DELETE FROM sponsors;
DELETE FROM venues;
DELETE FROM event_locations;
DELETE FROM files_folder_links;
DELETE FROM files;
DELETE FROM upload_folders_parent_links;
DELETE FROM upload_folders;

ALTER SEQUENCE events_id_seq RESTART WITH 1;
ALTER SEQUENCE players_id_seq RESTART WITH 1;
ALTER SEQUENCE sponsors_id_seq RESTART WITH 1;
ALTER SEQUENCE venues_id_seq RESTART WITH 1;
ALTER SEQUENCE event_locations_id_seq RESTART WITH 1;
ALTER SEQUENCE files_id_seq RESTART WITH 1;
ALTER SEQUENCE upload_folders_id_seq RESTART WITH 1;
