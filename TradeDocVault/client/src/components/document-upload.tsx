import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, CheckCircle, AlertCircle } from "lucide-react";
import { useUploadDocuments } from "@/hooks/use-documents";
import { useToast } from "@/hooks/use-toast";

interface DocumentUploadProps {
  customerId: number;
}

export function DocumentUpload({ customerId }: DocumentUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadDocuments = useUploadDocuments(customerId);
  const { toast } = useToast();

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files) {
      handleFiles(files);
    }
  };

  const handleFiles = async (files: FileList) => {
    // Validate files
    const validFiles = Array.from(files).filter(file => {
      if (file.type !== 'application/pdf') {
        toast({
          variant: "destructive",
          title: "Invalid file",
          description: `${file.name} is not a PDF file`,
        });
        return false;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast({
          variant: "destructive",
          title: "File too large",
          description: `${file.name} exceeds 10MB limit`,
        });
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    try {
      const fileList = new DataTransfer();
      validFiles.forEach(file => fileList.items.add(file));
      
      await uploadDocuments.mutateAsync(fileList.files);
      
      toast({
        title: "Success",
        description: `${validFiles.length} document(s) uploaded successfully`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: "Failed to upload documents. Please try again.",
      });
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Upload className="w-5 h-5 mr-2" />
          Upload Documents
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive 
              ? "border-blue-400 bg-blue-50" 
              : "border-gray-300 hover:border-blue-300"
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <div className="mx-auto max-w-xs">
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-900 mb-2">Upload PDFs</p>
            <p className="text-gray-600 mb-4">
              Drag and drop files here, or click to browse
            </p>
            <Button 
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadDocuments.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {uploadDocuments.isPending ? "Uploading..." : "Choose Files"}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf"
              onChange={handleFileInput}
              className="hidden"
            />
          </div>
        </div>

        {uploadDocuments.isPending && (
          <div className="mt-4 space-y-3">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-900">
                  Processing documents...
                </span>
                <span className="text-sm text-blue-600">
                  <AlertCircle className="w-4 h-4 inline mr-1" />
                  Processing
                </span>
              </div>
              <Progress value={75} className="w-full" />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
