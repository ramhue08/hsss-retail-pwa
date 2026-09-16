export type SendContactDetails = {
  first_name: string;
  email: string;
  phone: string;
  postcode: string;
  marketing_consent: boolean;
};

export const EMPTY_CONTACT: SendContactDetails = {
  first_name: "",
  email: "",
  phone: "",
  postcode: "",
  marketing_consent: false,
};

export const LOCAL_DRAFT_KEY = "hsss_retail_draft";
export const LOCAL_CONTACT_KEY = "hsss_retail_contact";
