import { FileUpload } from "../file-upload";

export default function FileUploadExample() {
  return (
    <div className="p-6">
      <FileUpload
        onFilesSelected={(files) => console.log("Files selected:", files)}
      />
    </div>
  );
}
