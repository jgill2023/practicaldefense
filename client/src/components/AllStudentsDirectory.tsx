import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Users, ArrowUpDown, ArrowUp, ArrowDown, Mail, Phone, Calendar, X, Shuffle } from "lucide-react";
import { format } from "date-fns";
import { RescheduleModal } from "@/components/RescheduleModal";
import { CrossEnrollmentModal } from "@/components/CrossEnrollmentModal";

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  concealedCarryLicenseExpiration?: string;
  enrollments: {
    id: string;
    courseTitle: string;
    courseAbbreviation?: string;
    scheduleDate: string;
    scheduleStartTime: string;
    scheduleEndTime: string;
    paymentStatus: string;
  }[];
}

interface StudentsData {
  current: Student[];
  former: Student[];
  held: Student[];
}

interface FlattenedStudent {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  licenseExpiration?: string;
  status: 'current' | 'former' | 'held';
  enrollmentCount: number;
  latestCourse?: string;
  latestScheduleDate?: string;
  latestEnrollmentId?: string;
}

type SortField = 'name' | 'email' | 'status' | 'enrollmentCount' | 'latestCourse' | 'licenseExpiration';
type SortDirection = 'asc' | 'desc' | null;

interface AllStudentsDirectoryProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AllStudentsDirectory({ isOpen, onClose }: AllStudentsDirectoryProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  
  // Modal states for reschedule and cross-enrollment
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [crossEnrollmentModalOpen, setCrossEnrollmentModalOpen] = useState(false);
  const [selectedStudentForReschedule, setSelectedStudentForReschedule] = useState<{
    studentId: string;
    studentName: string;
    enrollmentId: string;
    currentCourse: string;
    currentScheduleDate: string;
  } | null>(null);
  const [selectedStudentForCrossEnrollment, setSelectedStudentForCrossEnrollment] = useState<{
    studentId: string;
    studentName: string;
  } | null>(null);

  // Query for students data
  const { data: studentsData, isLoading, isError } = useQuery<StudentsData>({
    queryKey: ['/api/students'],
    enabled: isOpen,
  });

  // Flatten all students into a single array with status
  const allStudents = useMemo(() => {
    if (!studentsData) return [];

    const students: FlattenedStudent[] = [];

    // Helper to create flattened student
    const flattenStudent = (student: Student, status: 'current' | 'former' | 'held'): FlattenedStudent => {
      const latestEnrollment = student.enrollments[0]; // Assuming sorted by most recent

      return {
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        email: student.email,
        phone: student.phone,
        licenseExpiration: student.concealedCarryLicenseExpiration,
        status,
        enrollmentCount: student.enrollments.length,
        latestCourse: latestEnrollment?.courseTitle,
        latestScheduleDate: latestEnrollment?.scheduleDate,
        latestEnrollmentId: latestEnrollment?.id,
      };
    };

    // Add all students from each category
    studentsData.current.forEach(student => students.push(flattenStudent(student, 'current')));
    studentsData.former.forEach(student => students.push(flattenStudent(student, 'former')));
    studentsData.held.forEach(student => students.push(flattenStudent(student, 'held')));

    return students;
  }, [studentsData]);

  // Filter students
  const filteredStudents = useMemo(() => {
    let filtered = allStudents;

    // Filter by search term
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(student =>
        student.firstName.toLowerCase().includes(search) ||
        student.lastName.toLowerCase().includes(search) ||
        student.email.toLowerCase().includes(search) ||
        (student.phone && student.phone.includes(searchTerm))
      );
    }

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter(student => student.status === statusFilter);
    }

    return filtered;
  }, [allStudents, searchTerm, statusFilter]);

  // Sort students
  const sortedStudents = useMemo(() => {
    if (!sortField || !sortDirection) return filteredStudents;

    const sorted = [...filteredStudents].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'name':
          aValue = `${a.firstName} ${a.lastName}`.toLowerCase();
          bValue = `${b.firstName} ${b.lastName}`.toLowerCase();
          break;
        case 'email':
          aValue = a.email.toLowerCase();
          bValue = b.email.toLowerCase();
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'enrollmentCount':
          aValue = a.enrollmentCount;
          bValue = b.enrollmentCount;
          break;
        case 'latestCourse':
          aValue = (a.latestCourse || '').toLowerCase();
          bValue = (b.latestCourse || '').toLowerCase();
          break;
        case 'licenseExpiration':
          aValue = a.licenseExpiration ? new Date(a.licenseExpiration).getTime() : 0;
          bValue = b.licenseExpiration ? new Date(b.licenseExpiration).getTime() : 0;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [filteredStudents, sortField, sortDirection]);

  // Handle column header click for sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Cycle through: asc -> desc -> null
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortField(null);
        setSortDirection(null);
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Get sort icon
  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />;
    if (sortDirection === 'asc') return <ArrowUp className="h-4 w-4 ml-1" />;
    if (sortDirection === 'desc') return <ArrowDown className="h-4 w-4 ml-1" />;
    return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'current':
        return <Badge variant="default" className="bg-blue-500">Current</Badge>;
      case 'former':
        return <Badge variant="secondary" className="bg-gray-500">Former</Badge>;
      case 'held':
        return <Badge variant="outline" className="border-orange-500 text-orange-700">Held</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), "MMM d, yyyy");
    } catch {
      return dateString;
    }
  };

  const formatPhoneNumber = (phone?: string) => {
    if (!phone) return 'N/A';
    
    const digits = phone.replace(/\D/g, '');
    
    if (digits.length === 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    
    if (digits.length === 11 && digits[0] === '1') {
      return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
    }
    
    return phone;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-primary" />
              <DialogTitle className="text-xl">All Students Directory</DialogTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              data-testid="button-close-directory"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
            <span className="ml-3 text-muted-foreground">Loading students...</span>
          </div>
        ) : isError ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Users className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Failed to Load Students</h3>
              <p className="text-muted-foreground">Unable to retrieve student data. Please try again.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-students"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-status-filter">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Students</SelectItem>
                  <SelectItem value="current">Current</SelectItem>
                  <SelectItem value="held">Held</SelectItem>
                  <SelectItem value="former">Former</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Results count */}
            <div className="text-sm text-muted-foreground">
              Showing {sortedStudents.length} of {allStudents.length} students
            </div>

            {/* Students Table */}
            {sortedStudents.length === 0 ? (
              <div className="flex items-center justify-center py-12 border rounded-lg">
                <div className="text-center">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Students Found</h3>
                  <p className="text-muted-foreground">Try adjusting your search or filters.</p>
                </div>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background z-10">
                      <TableRow>
                        <TableHead>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSort('name')}
                            className="font-semibold hover:bg-transparent"
                            data-testid="sort-name"
                          >
                            Name
                            {getSortIcon('name')}
                          </Button>
                        </TableHead>
                        <TableHead>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSort('email')}
                            className="font-semibold hover:bg-transparent"
                            data-testid="sort-email"
                          >
                            Email
                            {getSortIcon('email')}
                          </Button>
                        </TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSort('status')}
                            className="font-semibold hover:bg-transparent"
                            data-testid="sort-status"
                          >
                            Status
                            {getSortIcon('status')}
                          </Button>
                        </TableHead>
                        <TableHead>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSort('enrollmentCount')}
                            className="font-semibold hover:bg-transparent"
                            data-testid="sort-enrollments"
                          >
                            Enrollments
                            {getSortIcon('enrollmentCount')}
                          </Button>
                        </TableHead>
                        <TableHead>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSort('latestCourse')}
                            className="font-semibold hover:bg-transparent"
                            data-testid="sort-latest-course"
                          >
                            Latest Course
                            {getSortIcon('latestCourse')}
                          </Button>
                        </TableHead>
                        <TableHead>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSort('licenseExpiration')}
                            className="font-semibold hover:bg-transparent"
                            data-testid="sort-license"
                          >
                            License Exp.
                            {getSortIcon('licenseExpiration')}
                          </Button>
                        </TableHead>
                        <TableHead className="text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedStudents.map((student) => (
                        <TableRow key={student.id} data-testid={`row-student-${student.id}`}>
                          <TableCell className="font-medium">
                            {student.firstName} {student.lastName}
                          </TableCell>
                          <TableCell>
                            <a
                              href={`mailto:${student.email}`}
                              className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                              data-testid={`link-email-${student.id}`}
                            >
                              <Mail className="h-3 w-3" />
                              {student.email}
                            </a>
                          </TableCell>
                          <TableCell>
                            {student.phone ? (
                              <a
                                href={`tel:${student.phone}`}
                                className="text-green-600 hover:text-green-800 hover:underline flex items-center gap-1"
                                data-testid={`link-phone-${student.id}`}
                              >
                                <Phone className="h-3 w-3" />
                                {formatPhoneNumber(student.phone)}
                              </a>
                            ) : (
                              <span className="text-muted-foreground">N/A</span>
                            )}
                          </TableCell>
                          <TableCell>{getStatusBadge(student.status)}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline">{student.enrollmentCount}</Badge>
                          </TableCell>
                          <TableCell>
                            {student.latestCourse ? (
                              <div className="space-y-1">
                                <div className="font-medium text-sm">{student.latestCourse}</div>
                                {student.latestScheduleDate && (
                                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {formatDate(student.latestScheduleDate)}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">No enrollments</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {formatDate(student.licenseExpiration)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-2">
                              {student.status === 'current' && student.latestEnrollmentId && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedStudentForReschedule({
                                      studentId: student.id,
                                      studentName: `${student.firstName} ${student.lastName}`,
                                      enrollmentId: student.latestEnrollmentId!,
                                      currentCourse: student.latestCourse || 'Unknown Course',
                                      currentScheduleDate: student.latestScheduleDate || '',
                                    });
                                    setRescheduleModalOpen(true);
                                  }}
                                  title="Reschedule student"
                                  data-testid={`button-reschedule-${student.id}`}
                                >
                                  <Shuffle className="h-4 w-4 mr-1" />
                                  Reschedule
                                </Button>
                              )}
                              {(student.status === 'former' || student.status === 'held') && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedStudentForCrossEnrollment({
                                      studentId: student.id,
                                      studentName: `${student.firstName} ${student.lastName}`,
                                    });
                                    setCrossEnrollmentModalOpen(true);
                                  }}
                                  title="Enroll in course"
                                  data-testid={`button-enroll-${student.id}`}
                                >
                                  <Users className="h-4 w-4 mr-1" />
                                  Enroll
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Reschedule Modal */}
        {selectedStudentForReschedule && (
          <RescheduleModal
            isOpen={rescheduleModalOpen}
            onClose={() => {
              setRescheduleModalOpen(false);
              setSelectedStudentForReschedule(null);
            }}
            studentId={selectedStudentForReschedule.studentId}
            studentName={selectedStudentForReschedule.studentName}
            enrollmentId={selectedStudentForReschedule.enrollmentId}
            currentCourse={selectedStudentForReschedule.currentCourse}
            currentScheduleDate={selectedStudentForReschedule.currentScheduleDate}
          />
        )}

        {/* Cross-Enrollment Modal */}
        {selectedStudentForCrossEnrollment && (
          <CrossEnrollmentModal
            isOpen={crossEnrollmentModalOpen}
            onClose={() => {
              setCrossEnrollmentModalOpen(false);
              setSelectedStudentForCrossEnrollment(null);
            }}
            studentId={selectedStudentForCrossEnrollment.studentId}
            studentName={selectedStudentForCrossEnrollment.studentName}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
