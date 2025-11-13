const galleryTitleOverrides: Record<string, string> = {
  couple: "Det vackra brudparet",
  early: "Första åren tillsammans",
  morocco: "Bröllopsfesten i Marocko",
  quito: "Ovärderliga Quito",
  near: "Våra nära och kära",
  notpresent: "Hyllning till de som inte kan närvara",
};

export const gallerySectionOrder = [
  "early",
  "near",
  "couple",
  "notpresent",
  "morocco",
  "quito",
] as const;

export default galleryTitleOverrides;
