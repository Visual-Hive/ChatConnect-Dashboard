import { DocumentList } from "../document-list";

export default function DocumentListExample() {
  const documents = [
    {
      id: "1",
      name: "conference-schedule.pdf",
      size: "2.4 MB",
      status: "ready" as const,
      uploadedAt: new Date(),
    },
    {
      id: "2",
      name: "speaker-bios.pdf",
      size: "1.8 MB",
      status: "processing" as const,
      uploadedAt: new Date(),
    },
    {
      id: "3",
      name: "venue-info.csv",
      size: "0.5 MB",
      status: "ready" as const,
      uploadedAt: new Date(),
    },
  ];

  return (
    <DocumentList
      documents={documents}
      onDelete={(id) => console.log("Delete:", id)}
      onView={(id) => console.log("View:", id)}
    />
  );
}
