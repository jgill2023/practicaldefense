import { useState, lazy, Suspense } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ObjectUploader } from "@/components/ObjectUploader";
import { Save, Clock, Target, FileText, ImageIcon } from "lucide-react";
import type { CourseWithSchedules } from "@shared/schema";
import type { UploadResult } from "@uppy/core";

// Lazy load ReactQuill to avoid SSR issues
const ReactQuill = lazy(() => import('react-quill'));

const courseSchema = z.object({
  title: z.string().min(1, "Course title is required"),
  briefDescription: z.string().max(500, "Brief description must be under 500 characters").optional(),
  description: z.string().min(1, "Course description is required"),
  price: z.string().min(1, "Price is required"),
  duration: z.string().min(1, "Duration is required"),
  category: z.string().min(1, "Category is required"),
  classroomTime: z.string().optional(),
  rangeTime: z.string().optional(),
  rounds: z.number().min(0, "Rounds must be a positive number").optional(),
  prerequisites: z.string().optional(),
  maxStudents: z.number().min(1, "Must allow at least 1 student").max(100, "Cannot exceed 100 students"),
  imageUrl: z.string().optional(),
});

type CourseFormData = z.infer<typeof courseSchema>;

const courseCategories = [
  "Basic Firearms Safety",
  "Concealed Carry",
  "Advanced Marksmanship",
  "Tactical Training",
  "Hunter Safety",
  "Competition Shooting",
  "Self-Defense",
  "Law Enforcement",
  "Military Training",
  "Instructor Development",
];

interface EditCourseFormProps {
  course: CourseWithSchedules;
  isOpen: boolean;
  onClose: () => void;
  onCourseUpdated?: () => void;
}

export function EditCourseForm({ course, isOpen, onClose, onCourseUpdated }: EditCourseFormProps) {
  const [currentTab, setCurrentTab] = useState("basic");
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>(course.imageUrl || "");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<CourseFormData>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      title: course.title,
      briefDescription: course.briefDescription || "",
      description: course.description,
      price: course.price.toString(),
      duration: course.duration,
      category: course.category,
      classroomTime: course.classroomTime || "",
      rangeTime: course.rangeTime || "",
      rounds: course.rounds || 0,
      prerequisites: course.prerequisites || "",
      maxStudents: course.maxStudents,
      imageUrl: course.imageUrl || "",
    },
  });

  // Update course mutation
  const updateCourseMutation = useMutation({
    mutationFn: async (data: CourseFormData) => {
      const courseData = {
        ...data,
        price: parseFloat(data.price),
        imageUrl: uploadedImageUrl || data.imageUrl,
      };
      const response = await apiRequest("PUT", `/api/instructor/courses/${course.id}`, courseData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Course Updated",
        description: "Your course has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/instructor/courses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/instructor/dashboard-stats"] });
      onCourseUpdated?.();
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to update course. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CourseFormData) => {
    updateCourseMutation.mutate(data);
  };

  // Handle image upload
  const handleGetUploadParameters = async () => {
    const response = await apiRequest("POST", "/api/objects/upload");
    const data = await response.json();
    return {
      method: "PUT" as const,
      url: data.uploadURL,
    };
  };

  const handleImageUploadComplete = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0) {
      const uploadURL = result.successful[0].uploadURL;
      if (uploadURL) {
        try {
          const response = await apiRequest("PUT", "/api/course-images", {
            courseImageURL: uploadURL,
          });
          const data = await response.json();
          setUploadedImageUrl(data.objectPath);
          form.setValue("imageUrl", data.objectPath);
          toast({
            title: "Image Uploaded",
            description: "Course image has been uploaded successfully.",
          });
        } catch (error) {
          toast({
            title: "Upload Error",
            description: "Failed to process the uploaded image.",
            variant: "destructive",
          });
        }
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Course: {course.title}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Tabs value={currentTab} onValueChange={setCurrentTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="firearms">Time Breakdown</TabsTrigger>
              <TabsTrigger value="media">Media</TabsTrigger>
            </TabsList>

            {/* Basic Information Tab */}
            <TabsContent value="basic" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <FileText className="h-5 w-5" />
                    <span>Course Information</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="title">Course Title *</Label>
                    <Input
                      id="title"
                      {...form.register("title")}
                      placeholder="Enter course title"
                      data-testid="input-course-title"
                    />
                    {form.formState.errors.title && (
                      <p className="text-sm text-red-600 mt-1">{form.formState.errors.title.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="briefDescription">Brief Description</Label>
                    <Textarea
                      id="briefDescription"
                      {...form.register("briefDescription")}
                      placeholder="Short description for course listings (max 500 characters)"
                      className="min-h-20"
                      data-testid="input-brief-description"
                    />
                    {form.formState.errors.briefDescription && (
                      <p className="text-sm text-red-600 mt-1">{form.formState.errors.briefDescription.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="category">Course Category *</Label>
                    <Select
                      value={form.watch("category")}
                      onValueChange={(value) => form.setValue("category", value)}
                    >
                      <SelectTrigger data-testid="select-category">
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        {courseCategories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {form.formState.errors.category && (
                      <p className="text-sm text-red-600 mt-1">{form.formState.errors.category.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="price">Price (USD) *</Label>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        {...form.register("price")}
                        placeholder="299.99"
                        data-testid="input-price"
                      />
                      {form.formState.errors.price && (
                        <p className="text-sm text-red-600 mt-1">{form.formState.errors.price.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="maxStudents">Max Students *</Label>
                      <Input
                        id="maxStudents"
                        type="number"
                        {...form.register("maxStudents", { valueAsNumber: true })}
                        placeholder="20"
                        data-testid="input-max-students"
                      />
                      {form.formState.errors.maxStudents && (
                        <p className="text-sm text-red-600 mt-1">{form.formState.errors.maxStudents.message}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Details Tab */}
            <TabsContent value="details" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <FileText className="h-5 w-5" />
                    <span>Course Details</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="description">Full Description *</Label>
                    <div className="react-quill-wrapper">
                      <Suspense fallback={
                        <div className="h-48 bg-muted animate-pulse rounded-md flex items-center justify-center">
                          <span className="text-muted-foreground">Loading editor...</span>
                        </div>
                      }>
                        <ReactQuill
                          value={form.watch("description") || ""}
                          onChange={(content) => form.setValue("description", content)}
                          placeholder="Detailed course description, learning objectives, what students will gain..."
                          modules={{
                            toolbar: [
                              [{ 'header': [1, 2, 3, false] }],
                              ['bold', 'italic', 'underline'],
                              [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                              ['blockquote'],
                              ['link'],
                              ['clean']
                            ]
                          }}
                          formats={[
                            'header', 'bold', 'italic', 'underline', 
                            'list', 'bullet', 'blockquote', 'link'
                          ]}
                          theme="snow"
                          style={{ minHeight: '200px' }}
                        />
                      </Suspense>
                    </div>
                    {form.formState.errors.description && (
                      <p className="text-sm text-red-600 mt-1">{form.formState.errors.description.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="duration">Duration *</Label>
                    <Input
                      id="duration"
                      {...form.register("duration")}
                      placeholder="8 hours, 2 days, etc."
                      data-testid="input-duration"
                    />
                    {form.formState.errors.duration && (
                      <p className="text-sm text-red-600 mt-1">{form.formState.errors.duration.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="prerequisites">Prerequisites</Label>
                    <Textarea
                      id="prerequisites"
                      {...form.register("prerequisites")}
                      placeholder="Any required certifications, experience level, or prior courses..."
                      className="min-h-20"
                      data-testid="input-prerequisites"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Firearms Specific Tab */}
            <TabsContent value="firearms" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Target className="h-5 w-5" />
                    <span>Firearms Training Details</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="classroomTime">Classroom Time</Label>
                      <Input
                        id="classroomTime"
                        {...form.register("classroomTime")}
                        placeholder="4 hours"
                        data-testid="input-classroom-time"
                      />
                    </div>

                    <div>
                      <Label htmlFor="rangeTime">Range Time</Label>
                      <Input
                        id="rangeTime"
                        {...form.register("rangeTime")}
                        placeholder="4 hours"
                        data-testid="input-range-time"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="rounds">Ammunition Required (Rounds)</Label>
                    <Input
                      id="rounds"
                      type="number"
                      {...form.register("rounds", { valueAsNumber: true })}
                      placeholder="50"
                      data-testid="input-rounds"
                    />
                    {form.formState.errors.rounds && (
                      <p className="text-sm text-red-600 mt-1">{form.formState.errors.rounds.message}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Media Tab */}
            <TabsContent value="media" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <ImageIcon className="h-5 w-5" />
                    <span>Course Media</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Course Image</Label>
                    <div className="space-y-4">
                      {(uploadedImageUrl || form.watch("imageUrl")) && (
                        <div className="relative">
                          <img
                            src={uploadedImageUrl || form.watch("imageUrl") || ""}
                            alt="Course preview"
                            className="w-full h-48 object-cover rounded-lg border"
                          />
                        </div>
                      )}
                      <ObjectUploader
                        maxNumberOfFiles={1}
                        maxFileSize={5242880} // 5MB
                        onGetUploadParameters={handleGetUploadParameters}
                        onComplete={handleImageUploadComplete}
                        buttonClassName="w-full"
                      >
                        <div className="flex items-center justify-center space-x-2">
                          <ImageIcon className="h-4 w-4" />
                          <span>Upload Course Image</span>
                        </div>
                      </ObjectUploader>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Form Actions */}
          <div className="flex justify-between pt-6 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={updateCourseMutation.isPending}
              data-testid="button-update-course"
            >
              <Save className="mr-2 h-4 w-4" />
              {updateCourseMutation.isPending ? "Updating..." : "Update Course"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}