import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ObjectUploader } from "@/components/ObjectUploader";
import { Plus, GraduationCap, Clock, Target, FileText, ImageIcon } from "lucide-react";
import type { Category } from "@shared/schema";

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


interface CourseCreationFormProps {
  isOpen?: boolean;
  onClose?: () => void;
  onCourseCreated?: () => void;
}

export function CourseCreationForm({ isOpen = false, onClose, onCourseCreated }: CourseCreationFormProps) {
  const [currentTab, setCurrentTab] = useState("basic");
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch categories from API
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });

  const form = useForm<CourseFormData>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      maxStudents: 20,
      rounds: 0,
    },
  });

  const createCourseMutation = useMutation({
    mutationFn: async (data: CourseFormData) => {
      const response = await apiRequest("POST", "/api/instructor/courses", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Course Created",
        description: "Your course has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/instructor/courses"] });
      onCourseCreated?.();
      onClose?.();
      form.reset();
      setUploadedImageUrl("");
    },
    onError: (error) => {
      toast({
        title: "Error Creating Course",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CourseFormData) => {
    const courseData = {
      ...data,
      imageUrl: uploadedImageUrl || undefined,
    };
    createCourseMutation.mutate(courseData);
  };

  const handleGetUploadParameters = async () => {
    try {
      console.log('Getting upload parameters...');
      setIsUploadingImage(true);
      const response = await apiRequest("POST", "/api/objects/upload");
      const data = await response.json();
      console.log('Upload parameters received:', data);
      return {
        method: 'PUT' as const,
        url: data.uploadURL,
      };
    } catch (error) {
      console.error('Error getting upload parameters:', error);
      setIsUploadingImage(false);
      throw error;
    }
  };

  const handleUploadComplete = async (result: { successful: any[] }) => {
    console.log('Upload complete result:', result);
    
    if (result.successful && result.successful.length > 0) {
      const uploadURL = result.successful[0].uploadURL;
      console.log('Processing upload URL:', uploadURL);
      
      if (uploadURL) {
        try {
          // Update the course image and set ACL policy
          console.log('Setting course image ACL...');
          const response = await apiRequest("PUT", "/api/course-images", {
            courseImageURL: uploadURL,
          });
          const data = await response.json();
          console.log('ACL response:', data);
          
          // Set the uploaded image URL for preview and form
          setUploadedImageUrl(data.objectPath);
          form.setValue("imageUrl", data.objectPath);
          
          toast({
            title: "Image Uploaded",
            description: "Course image has been uploaded successfully.",
          });
        } catch (error) {
          console.error('Upload processing error:', error);
          toast({
            title: "Upload Error",
            description: "Failed to process uploaded image. Please try again.",
            variant: "destructive",
          });
        } finally {
          setIsUploadingImage(false);
        }
      }
    } else {
      console.error('Upload failed - no successful uploads');
      setIsUploadingImage(false);
      toast({
        title: "Upload Failed",
        description: "No files were successfully uploaded.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <GraduationCap className="h-5 w-5" />
            <span>Create New Training Course</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} onKeyDown={(e) => {
          // Prevent form submission on Enter key press
          if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'BUTTON') {
            e.preventDefault();
          }
        }} className="space-y-6">
          <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="training">Training Details</TabsTrigger>
              <TabsTrigger value="media">Image & Settings</TabsTrigger>
            </TabsList>

            {/* Basic Information Tab */}
            <TabsContent value="basic" className="space-y-4">
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
                      placeholder="e.g., Basic Pistol Safety Course"
                      data-testid="input-course-title"
                    />
                    {form.formState.errors.title && (
                      <p className="text-sm text-destructive mt-1">{form.formState.errors.title.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="category">Category *</Label>
                    <Select onValueChange={(value) => form.setValue("category", value)}>
                      <SelectTrigger data-testid="select-course-category">
                        <SelectValue placeholder="Select course category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories
                          .filter(category => category.isActive)
                          .map((category) => (
                          <SelectItem key={category.id} value={category.name}>
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: category.color || '#3b82f6' }}
                              />
                              {category.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {form.formState.errors.category && (
                      <p className="text-sm text-destructive mt-1">{form.formState.errors.category.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="price">Course Cost *</Label>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        {...form.register("price")}
                        placeholder="299.00"
                        data-testid="input-course-price"
                      />
                      {form.formState.errors.price && (
                        <p className="text-sm text-destructive mt-1">{form.formState.errors.price.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="duration">Duration *</Label>
                      <Input
                        id="duration"
                        {...form.register("duration")}
                        placeholder="e.g., 8 hours, 2 days"
                        data-testid="input-course-duration"
                      />
                      {form.formState.errors.duration && (
                        <p className="text-sm text-destructive mt-1">{form.formState.errors.duration.message}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="briefDescription">Brief Description (Optional)</Label>
                    <Textarea
                      id="briefDescription"
                      {...form.register("briefDescription")}
                      placeholder="Short summary for course listings (max 500 characters)"
                      className="resize-none"
                      rows={2}
                      data-testid="textarea-brief-description"
                    />
                    {form.formState.errors.briefDescription && (
                      <p className="text-sm text-destructive mt-1">{form.formState.errors.briefDescription.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="description">Detailed Description *</Label>
                    <Textarea
                      id="description"
                      {...form.register("description")}
                      placeholder="Comprehensive course description including objectives, curriculum, and what students will learn"
                      className="resize-none"
                      rows={6}
                      data-testid="textarea-course-description"
                    />
                    {form.formState.errors.description && (
                      <p className="text-sm text-destructive mt-1">{form.formState.errors.description.message}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Training Details Tab */}
            <TabsContent value="training" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Target className="h-5 w-5" />
                    <span>Firearms Training Specifications</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="classroomTime">Classroom Time</Label>
                      <Input
                        id="classroomTime"
                        {...form.register("classroomTime")}
                        placeholder="e.g., 4 hours, 1 day"
                        data-testid="input-classroom-time"
                      />
                    </div>

                    <div>
                      <Label htmlFor="rangeTime">Range Time</Label>
                      <Input
                        id="rangeTime"
                        {...form.register("rangeTime")}
                        placeholder="e.g., 4 hours, half day"
                        data-testid="input-range-time"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="rounds">Rounds Required</Label>
                    <Input
                      id="rounds"
                      type="number"
                      {...form.register("rounds", { valueAsNumber: true })}
                      placeholder="e.g., 50, 100, 200"
                      data-testid="input-rounds"
                    />
                    {form.formState.errors.rounds && (
                      <p className="text-sm text-destructive mt-1">{form.formState.errors.rounds.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="prerequisites">Course Prerequisites</Label>
                    <Textarea
                      id="prerequisites"
                      {...form.register("prerequisites")}
                      placeholder="List any required prior training, certifications, or experience"
                      className="resize-none"
                      rows={4}
                      data-testid="textarea-prerequisites"
                    />
                  </div>

                  <div>
                    <Label htmlFor="maxStudents">Maximum Students</Label>
                    <Input
                      id="maxStudents"
                      type="number"
                      {...form.register("maxStudents", { valueAsNumber: true })}
                      placeholder="20"
                      data-testid="input-max-students"
                    />
                    {form.formState.errors.maxStudents && (
                      <p className="text-sm text-destructive mt-1">{form.formState.errors.maxStudents.message}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Media & Settings Tab */}
            <TabsContent value="media" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <ImageIcon className="h-5 w-5" />
                    <span>Course Image</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {uploadedImageUrl && (
                    <div className="mb-4">
                      <img 
                        src={uploadedImageUrl} 
                        alt="Course preview" 
                        className="w-full max-w-md h-48 object-cover rounded-lg border"
                        data-testid="img-course-preview"
                      />
                    </div>
                  )}
                  
                  <ObjectUploader
                    maxNumberOfFiles={1}
                    maxFileSize={5 * 1024 * 1024} // 5MB
                    onGetUploadParameters={handleGetUploadParameters}
                    onComplete={handleUploadComplete}
                    buttonClassName="w-full"
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <ImageIcon className="h-4 w-4" />
                      <span>Upload Course Image</span>
                    </div>
                  </ObjectUploader>
                  
                  <p className="text-sm text-muted-foreground">
                    Upload an image to represent your course. Recommended size: 800x600px or larger.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-between pt-6 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <div className="flex space-x-2">
              {currentTab !== "basic" && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const tabs = ["basic", "training", "media"];
                    const currentIndex = tabs.indexOf(currentTab);
                    if (currentIndex > 0) {
                      setCurrentTab(tabs[currentIndex - 1]);
                    }
                  }}
                >
                  Previous
                </Button>
              )}
              {currentTab !== "media" ? (
                <Button
                  type="button"
                  onClick={() => {
                    const tabs = ["basic", "training", "media"];
                    const currentIndex = tabs.indexOf(currentTab);
                    if (currentIndex < tabs.length - 1) {
                      setCurrentTab(tabs[currentIndex + 1]);
                    }
                  }}
                >
                  Next
                </Button>
              ) : (
                <Button 
                  type="submit" 
                  disabled={createCourseMutation.isPending || isUploadingImage}
                  data-testid="button-submit-course"
                >
                  {createCourseMutation.isPending ? "Creating..." : isUploadingImage ? "Uploading Image..." : "Create Course"}
                </Button>
              )}
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}