import { site } from "@/content/site";

const baseUrl = "https://www.mercator-musicschool.com";

export const localBusinessJsonLd = {
  "@context": "https://schema.org",
  "@type": ["LocalBusiness", "MusicSchool"],
  "@id": `${baseUrl}/#school`,
  name: site.name,
  url: `${baseUrl}/`,
  telephone: `+81-${site.phone.slice(1, 3)}-${site.phone.slice(3, 7)}-${site.phone.slice(7)}`,
  email: site.email,
  image: `${baseUrl}/images/Home/Top.jpg`,
  description: "茨城県土浦市永国の音楽教室。ドラム、ポップスピアノ、ギター、ベース、フィンガードラム、DTMを初心者から個人レッスンで学べます。",
  address: {
    "@type": "PostalAddress",
    postalCode: "300-0817",
    addressRegion: "茨城県",
    addressLocality: "土浦市",
    streetAddress: "永国875",
    addressCountry: "JP",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: 36.0636,
    longitude: 140.1839,
  },
  areaServed: ["土浦市", "つくば市", "阿見町", "牛久市", "かすみがうら市"],
  priceRange: "月額10000円から",
  paymentAccepted: "Cash",
  sameAs: [],
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "音楽レッスン",
    itemListElement: [
      "ドラム",
      "ポップスピアノ",
      "ギター",
      "ベース",
      "フィンガードラム",
      "DTM",
    ].map((name) => ({
      "@type": "Offer",
      itemOffered: {
        "@type": "Course",
        name: `${name}レッスン`,
        provider: {
          "@id": `${baseUrl}/#school`,
        },
      },
    })),
  },
};

export function jsonLdScript(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
