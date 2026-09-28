"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  QueueListIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import CRUDModal from "@/components/modals/CRUDModal";
import DeleteConfirmationModal from "@/components/modals/DeleteConfirmationModal";
import DataTable from "@/components/tables/DataTable";
import { PageSkeleton } from "@/components/ui/SkeletonLoader";
import { useApiWithStore } from "@/hooks/useApiWithStore";
import { usePagePermission } from "@/hooks/usePagePermission";
import StatusToggle from "@/components/forms/StatusToggle";

interface Course {
  courseId: number;
  courseName: string;
  displayOrder: number;
  isActive: boolean;
}

export default function CourseManagementPage() {
  const { selectedStoreCode, buildApiUrl } = useApiWithStore();

  const { hasPermission, loading: permissionLoading } = usePagePermission({
    requiredPermissions: ["courses.view"],
  });

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStoreCode]);

  const fetchData = async () => {
    try {
      const url = buildApiUrl("/api/dashboard/course");
      const response = await fetch(url);

      if (response.ok) {
        const data = await response.json();
        setCourses(
          data.map((course: any) => ({
            ...course,
            courseId: Number(course.courseId),
            displayOrder: Number(course.displayOrder),
          })),
        );
      }
    } catch (error) {
      toast.error("Error loading courses");
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingCourse(null);
    setShowModal(true);
  };

  const handleEdit = (course: Course) => {
    setEditingCourse(course);
    setShowModal(true);
  };

  const handleSave = async (formData: any) => {
    try {
      const baseUrl = editingCourse
        ? `/api/dashboard/course/${editingCourse.courseId}`
        : "/api/dashboard/course";
      const url = buildApiUrl(baseUrl);
      const method = editingCourse ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await response.json();
        toast.success(
          editingCourse
            ? "Course updated successfully!"
            : "Course created successfully!",
        );
        setShowModal(false);
        setEditingCourse(null);
        fetchData();
      } else {
        try {
          const errorData = await response.json();
          toast.error(errorData.error || "Failed to save course");
        } catch {
          toast.error("Failed to save course");
        }
      }
    } catch (error: any) {
      if (error instanceof TypeError && error.message.includes("fetch")) {
        toast.error("Network error. Please check your connection.");
      } else {
        toast.error(error instanceof Error ? error.message : "Error saving course");
      }
    }
  };

  const handleDeleteClick = (course: Course) => {
    setCourseToDelete(course);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!courseToDelete) return;

    try {
      const url = buildApiUrl(`/api/dashboard/course/${courseToDelete.courseId}`);
      const response = await fetch(url, { method: "DELETE" });

      if (response.ok) {
        setCourses(
          courses.filter((course) => course.courseId !== courseToDelete.courseId),
        );
        toast.success("Course deleted successfully");
        setShowDeleteModal(false);
        setCourseToDelete(null);
      } else {
        throw new Error("Failed to delete course");
      }
    } catch (error) {
      toast.error("Error deleting course");
      console.error("Error:", error);
    }
  };

  if (permissionLoading || loading) {
    return (
      <DashboardLayout>
        <PageSkeleton />
      </DashboardLayout>
    );
  }

  if (!hasPermission) {
    return null;
  }

  const activeCourses = courses.filter((course) => course.isActive).length;
  const inactiveCourses = courses.filter((course) => !course.isActive).length;
  const nextDisplayOrder =
    courses.reduce((max, course) => Math.max(max, course.displayOrder), 0) + 1;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Course Master
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage meal courses and the order they appear in.
            </p>
          </div>
          <button
            onClick={handleAdd}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Add Course
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                  <QueueListIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Total Courses
                </p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {courses.length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                  <CheckCircleIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Active
                </p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {activeCourses}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
                  <XCircleIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Inactive
                </p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {inactiveCourses}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Course List
            </h3>
          </div>
          {courses.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <QueueListIcon className="w-8 h-8 text-gray-400 dark:text-gray-500" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No courses found
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Get started by adding your first course.
              </p>
              <button
                onClick={handleAdd}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                Add Course
              </button>
            </div>
          ) : (
            <DataTable
              columns={[
                {
                  header: "#",
                  accessor: "courseId",
                  sortable: false,
                  cell: (_course: Course, index?: number) => (
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                        <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                          {(index ?? 0) + 1}
                        </span>
                      </div>
                    </div>
                  ),
                },
                {
                  header: "Course Name",
                  accessor: "courseName",
                  cell: (course: Course) => (
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mr-3">
                        <QueueListIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {course.courseName}
                      </div>
                    </div>
                  ),
                },
                {
                  header: "Display Order",
                  accessor: "displayOrder",
                },
                {
                  header: "Status",
                  accessor: "isActive",
                  cell: (course: Course) => (
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        course.isActive
                          ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                          : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                      }`}
                    >
                      {course.isActive ? (
                        <>
                          <CheckCircleIcon className="w-3 h-3 mr-1" />
                          Active
                        </>
                      ) : (
                        <>
                          <XCircleIcon className="w-3 h-3 mr-1" />
                          Inactive
                        </>
                      )}
                    </span>
                  ),
                },
                {
                  header: "Actions",
                  accessor: "courseId",
                  sortable: false,
                  cell: (course: Course) => (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEdit(course)}
                        className="text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 p-1 rounded transition-colors duration-200"
                        title="Edit course"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(course)}
                        className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 p-1 rounded transition-colors duration-200"
                        title="Delete course"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ),
                },
              ]}
              data={courses}
              keyExtractor={(course: Course) => course.courseId.toString()}
              searchPlaceholder="Search courses..."
              emptyMessage="No courses found"
            />
          )}
        </div>
      </div>

      <CRUDModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingCourse(null);
        }}
        title={editingCourse ? "Edit Course" : "Add New Course"}
        size="md"
      >
        <CourseForm
          course={editingCourse}
          nextDisplayOrder={nextDisplayOrder}
          onSave={handleSave}
          onCancel={() => {
            setShowModal(false);
            setEditingCourse(null);
          }}
        />
      </CRUDModal>

      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setCourseToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Course"
        itemName={courseToDelete?.courseName || ""}
      />
    </DashboardLayout>
  );
}

function CourseForm({
  course,
  nextDisplayOrder,
  onSave,
  onCancel,
}: {
  course?: Course | null;
  nextDisplayOrder: number;
  onSave: (data: any) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    courseName: "",
    displayOrder: String(nextDisplayOrder),
    isActive: true,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (course) {
      setFormData({
        courseName: course.courseName || "",
        displayOrder: String(course.displayOrder ?? 0),
        isActive: course.isActive,
      });
    } else {
      setFormData({
        courseName: "",
        displayOrder: String(nextDisplayOrder),
        isActive: true,
      });
    }
  }, [course, nextDisplayOrder]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await onSave({
        courseName: formData.courseName.trim(),
        displayOrder: parseInt(formData.displayOrder, 10),
        isActive: formData.isActive,
      });
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Course Name *
        </label>
        <input
          type="text"
          required
          maxLength={50}
          value={formData.courseName}
          onChange={(e) =>
            setFormData({ ...formData, courseName: e.target.value })
          }
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Enter course name"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Display Order *
        </label>
        <input
          type="number"
          required
          step="1"
          value={formData.displayOrder}
          onChange={(e) =>
            setFormData({ ...formData, displayOrder: e.target.value })
          }
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Enter display order"
        />
      </div>

      <StatusToggle
        label="Course Status"
        description="Toggle to control whether this course is active."
        value={formData.isActive}
        onChange={(val) => setFormData({ ...formData, isActive: val })}
      />

      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {loading ? "Saving..." : course ? "Update" : "Create"}
        </button>
      </div>
    </form>
  );
}
