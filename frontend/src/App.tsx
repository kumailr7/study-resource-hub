import React, { useState, useEffect } from "react";
import axios, { AxiosError } from "axios";
import { ThemeProvider, useTheme } from "./ThemeContext";

interface Resource {
  _id: string;
  name: string;
  link: string;
  category: string;
  type: string;
  tags: string[];
}

interface Request {
  _id: string;
  userName: string;
  resourceName: string;
  resourceType: string;
  requestDate: string;
  status: "pending" | "approved" | "rejected";
}

interface ErrorResponse {
  error: string;
}
// Updating it as per Testing (Backend URL)
const API_BASE_URL = "https://cs-resources.test/api";

// Date formatting function
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0"); // Months are zero-based
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

// ResourceTable Component
const ResourceTable: React.FC = () => {
  const { isDarkTheme, toggleTheme } = useTheme();
  const [resources, setResources] = useState<Resource[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [newResourceName, setNewResourceName] = useState("");
  const [newResourceLink, setNewResourceLink] = useState("");
  const [newResourceCategory, setNewResourceCategory] = useState("");
  const [newResourceType, setNewResourceType] = useState("");
  const [newResourceTags, setNewResourceTags] = useState<string[]>([]);
  const [newRequestUserName, setNewRequestUserName] = useState("");
  const [newRequestResourceName, setNewRequestResourceName] = useState("");
  const [newRequestResourceType, setNewRequestResourceType] = useState("");
  const [editResourceId, setEditResourceId] = useState<string | null>(null);
  const [searchTags, setSearchTags] = useState<string>("");
  const [filteredResources, setFilteredResources] = useState<Resource[]>([]);
  const [resourcePage, setResourcePage] = useState(1);
  const [requestPage, setRequestPage] = useState(1);
  const [resourceTotal, setResourceTotal] = useState(0);
  const [requestTotal, setRequestTotal] = useState(0);

  const [newRequestDate, setNewRequestDate] = useState("");

  const [newTag, setNewTag] = useState("");

  // Fetch resources and requests
  useEffect(() => {
    document.title = "CS-Resource-Hub";
    fetchResources();
    fetchRequests();
  }, [resourcePage, requestPage]);

  // Fetch resources from the API
  const fetchResources = async () => {
    try {
      const { data } = await axios.get(
        `${API_BASE_URL}/added-resources?page=${resourcePage}&limit=10`
      );
      setResources(data.data);
      setResourceTotal(data.total);
      setFilteredResources(data.data);
    } catch (error) {
      console.error("Error fetching resources:", error);
    }
  };

  // Fetch requests from the API
  const fetchRequests = async () => {
    try {
      const { data } = await axios.get(
        `${API_BASE_URL}/requests?page=${requestPage}&limit=10`
      );
      setRequests(data.data);
      setRequestTotal(data.total);
    } catch (error) {
      console.error("Error fetching requests:", error);
    }
  };

  // Handle Add Tag Function
  const handleAddTag = () => {
    if (newTag && !newResourceTags.includes(newTag)) {
      setNewResourceTags([...newResourceTags, newTag]);
      setNewTag("");
    }
  };

  // Handle Add Resource Function
  const handleAddResource = async () => {
    if (
      newResourceName &&
      newResourceLink &&
      newResourceCategory &&
      newResourceType
    ) {
      try {
        const newResource = {
          name: newResourceName,
          link: newResourceLink,
          category: newResourceCategory,
          type: newResourceType,
          tags: newResourceTags,
        };
        const { data } = await axios.post(
          `${API_BASE_URL}/added-resources`,
          newResource
        );
        setResources([...resources, data]);
        setNewResourceName("");
        setNewResourceLink("");
        setNewResourceCategory("");
        setNewResourceType("");
        setNewResourceTags([]);
      } catch (error) {
        console.error("Error adding resource:", error);
      }
    }
  };

  // Handle Edit Resource Function
  const handleEditResource = (resource: Resource) => {
    setEditResourceId(resource._id);
    setNewResourceName(resource.name);
    setNewResourceLink(resource.link);
    setNewResourceCategory(resource.category);
    setNewResourceType(resource.type);
    setNewResourceTags(resource.tags);
  };

  // Handle Update Resource Function
  const handleUpdateResource = async () => {
    if (editResourceId) {
      try {
        const updatedResource = {
          name: newResourceName,
          link: newResourceLink,
          category: newResourceCategory,
          type: newResourceType,
          tags: newResourceTags,
        };
        const { data } = await axios.put(
          `${API_BASE_URL}/added-resources/${editResourceId}`,
          updatedResource
        );
        setResources(
          resources.map((resource) =>
            resource._id === editResourceId ? data : resource
          )
        );
        setEditResourceId(null);
        setNewResourceName("");
        setNewResourceLink("");
        setNewResourceCategory("");
        setNewResourceType("");
        setNewResourceTags([]);
      } catch (error) {
        console.error("Error updating resource:", error);
      }
    }
  };

  // Handle Delete Resource Function
  const handleDeleteResource = async (id: string) => {
    try {
      await axios.delete(`${API_BASE_URL}/added-resources/${id}`);
      setResources(resources.filter((resource) => resource._id !== id));
    } catch (error) {
      console.error("Error deleting resource:", error);
    }
  };

  // Handle Add Request Function
  const handleAddRequest = async () => {
    if (
      newRequestUserName &&
      newRequestResourceName &&
      newRequestResourceType
    ) {
      try {
        const newRequest = {
          userName: newRequestUserName,
          resourceName: newRequestResourceName,
          resourceType: newRequestResourceType,
          status: "pending",
        };
        const { data } = await axios.post(
          `${API_BASE_URL}/requests`,
          newRequest
        );
        setRequests([...requests, data]);
        setNewRequestUserName("");
        setNewRequestResourceName("");
        setNewRequestResourceType("");
      } catch (error) {
        console.error("Error adding request:", error);
      }
    }
  };

  // Handle Request Status Change Function
  const handleRequestStatusChange = async (id: string, newStatus: string) => {
    try {
      const { data } = await axios.put(`${API_BASE_URL}/requests/${id}`, {
        status: newStatus,
      });
      setRequests(
        requests.map((request) => (request._id === id ? data : request))
      );
    } catch (error) {
      console.error("Error updating request status:", error);
    }
  };

 // Handle Fetch Filtered Resources Function
const fetchFilteredResources = async (tags: string) => {
  try {
    const { data } = await axios.get(
      `${API_BASE_URL}/added-resources?tags=${tags}`
    );
    setFilteredResources(data.data);
  } catch (error) {
    console.error("Error filtering resources:", error);
  }
};

// Handle Search Function
const handleSearch = () => {
  const tags = searchTags.split(",").map((tag) => tag.trim()); // No lowercase conversion
  if (tags.length === 0 || !tags[0]) {
    setFilteredResources(resources);
  } else {
    const formattedTags = tags.join(","); // Join tags back to a comma-separated string
    fetchFilteredResources(formattedTags);
  }
};


  // Added UI Elemenets
  return (
    <ThemeProvider>
      <div
        className={
          isDarkTheme ? "bg-gray-900 text-white" : "bg-white text-gray-900"
        }
      >
        {/* Header */}
        <div
          className={`text-center py-6 ${
            isDarkTheme ? "bg-blue-800" : "bg-blue-600"
          } text-white rounded shadow-lg`}
        >
          <h1 className="text-4xl font-bold">Cloud Study Resources Hub ☁️</h1>
          <p className="mt-2 text-lg">
            Manage resources and requests efficiently
          </p>
          <div className="flex items-center justify-center mt-4">
            <span
              className={`mr-2 ${
                isDarkTheme ? "text-gray-300" : "text-gray-800"
              } font-bold`}
            >
              Light
            </span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only"
                checked={isDarkTheme}
                onChange={toggleTheme}
              />
              <div className="w-11 h-6 bg-gray-200 rounded-full shadow-inner"></div>
              <div
                className={`absolute left-0 w-6 h-6 rounded-full shadow transition-transform duration-200 ease-in-out transform ${
                  isDarkTheme ? "translate-x-full bg-black" : "bg-yellow-400"
                }`}
              ></div>
            </label>
            <span
              className={`ml-2 ${
                isDarkTheme ? "text-gray-300" : "text-gray-800"
              } font-bold`}
            >
              Dark
            </span>
          </div>
        </div>

        {/* Add Resource Section */}
        <div
          className={`mt-8 shadow-md rounded-lg p-6 ${
            isDarkTheme ? "bg-gray-800" : "bg-white"
          }`}
        >
          <h2 className="text-2xl font-bold mb-4">Add New Resources</h2>
          <form className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold">Resource Name</label>
              <input
                type="text"
                className={`w-full p-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  isDarkTheme
                    ? "border-gray-600 bg-gray-700"
                    : "border-gray-300"
                }`}
                value={newResourceName}
                onChange={(e) => setNewResourceName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-bold">Resource Link</label>
              <input
                type="text"
                className={`w-full p-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  isDarkTheme
                    ? "border-gray-600 bg-gray-700"
                    : "border-gray-300"
                }`}
                value={newResourceLink}
                onChange={(e) => setNewResourceLink(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-bold">Category</label>
              <input
                type="text"
                className={`w-full p-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  isDarkTheme
                    ? "border-gray-600 bg-gray-700"
                    : "border-gray-300"
                }`}
                value={newResourceCategory}
                onChange={(e) => setNewResourceCategory(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-bold">Type</label>
              <select
                className={`w-full p-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  isDarkTheme
                    ? "border-gray-600 bg-gray-700"
                    : "border-gray-300"
                }`}
                value={newResourceType}
                onChange={(e) => setNewResourceType(e.target.value)}
              >
                <option>Select Type</option>
                <option value="Documentation">Documentation</option>
                <option value="Video">Video</option>
                <option value="Article">Article</option>
                <option value="Tool">Tool</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold">Tags</label>
              <div className="flex items-center">
                <input
                  type="text"
                  className={`w-3/4 p-2 border rounded-lg focus:outline-none focus:ring-2 ${
                    isDarkTheme
                      ? "border-gray-600 bg-gray-700"
                      : "border-gray-300"
                  }`}
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Add a tag"
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg shadow focus:outline-none focus:shadow-outline ml-2 font-bold"
                >
                  Add Tag
                </button>
              </div>
              <div className="mt-2">
                {newResourceTags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-block bg-blue-200 text-blue-800 text-xs font-semibold mr-2 px-1 py-0.5 rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </form>
          <div className="text-right mt-4">
            <button
              onClick={
                editResourceId ? handleUpdateResource : handleAddResource
              }
              className={`py-2 px-4 rounded focus:outline-none focus:shadow-outline ${
                editResourceId
                  ? "bg-green-500 hover:bg-green-700"
                  : "bg-blue-500 hover:bg-blue-700"
              } text-white font-bold`}
            >
              {editResourceId ? "Update Resource" : "Add Resource"}
            </button>
          </div>
        </div>

        {/* Available Resources Section */}
        <div
          className={`mt-8 shadow-md rounded-lg p-6 ${
            isDarkTheme ? "bg-gray-800" : "bg-white"
          }`}
        >
          <h2
            className={`text-2xl font-bold mb-4 ${
              isDarkTheme ? "text-gray-50" : "text-gray-800"
            }`}
          >
            Available Resources
          </h2>
          <div className="flex items-center mb-4">
           <input
             type="text"
             placeholder="Search by tags (comma-separated)"
             value={searchTags}
             onChange={(e) => setSearchTags(e.target.value)}
             className={`p-2 border rounded-lg focus:outline-none focus:ring-2 ${
             isDarkTheme ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-black border-gray-300'
             }`}
            />
            <button
             onClick={handleSearch}
             className={`ml-2 py-2 px-4 rounded-lg shadow focus:outline-none ${
             isDarkTheme
             ? 'bg-blue-800 hover:bg-blue-900 text-white'
             : 'bg-blue-600 hover:bg-blue-700 text-white'
             }`}
             >
             Search
            </button>
         </div>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className={isDarkTheme ? "bg-gray-700" : "bg-gray-100"}>
                  <th
                    className={`p-3 text-left text-sm font-bold ${
                      isDarkTheme ? "text-gray-400" : "text-gray-600"
                    } border`}
                  >
                    Name
                  </th>
                  <th
                    className={`p-3 text-left text-sm font-bold ${
                      isDarkTheme ? "text-gray-400" : "text-gray-600"
                    } border`}
                  >
                    Link
                  </th>
                  <th
                    className={`p-3 text-left text-sm font-bold ${
                      isDarkTheme ? "text-gray-400" : "text-gray-600"
                    } border`}
                  >
                    Category
                  </th>
                  <th
                    className={`p-3 text-left text-sm font-bold ${
                      isDarkTheme ? "text-gray-400" : "text-gray-600"
                    } border`}
                  >
                    Type
                  </th>
                  <th
                    className={`p-3 text-left text-sm font-bold ${
                      isDarkTheme ? "text-gray-400" : "text-gray-600"
                    } border`}
                  >
                    Tags
                  </th>
                  <th
                    className={`p-3 text-left text-sm font-bold ${
                      isDarkTheme ? "text-gray-400" : "text-gray-600"
                    } border`}
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
              {filteredResources.map((resource) => (
                  <tr
                    key={resource._id}
                    className={`hover:bg-gray-100 ${
                      isDarkTheme ? "hover:bg-gray-800" : ""
                    }`}
                  >
                    <td
                      className={`p-3 border ${
                        isDarkTheme ? "text-gray-300" : ""
                      }`}
                    >
                      {resource.name}
                    </td>
                    <td
                      className={`p-3 border ${
                        isDarkTheme ? "text-gray-300" : ""
                      }`}
                    >
                      <a
                        href={resource.link}
                        className={`text-blue-600 hover:underline ${
                          isDarkTheme ? "text-blue-400" : ""
                        }`}
                      >
                        {resource.link}
                      </a>
                    </td>
                    <td
                      className={`p-3 border ${
                        isDarkTheme ? "text-gray-300" : ""
                      }`}
                    >
                      {resource.category}
                    </td>
                    <td
                      className={`p-3 border ${
                        isDarkTheme ? "text-gray-300" : ""
                      }`}
                    >
                      {resource.type}
                    </td>
                    <td
                      className={`p-3 border ${
                        isDarkTheme ? "text-gray-300" : ""
                      }`}
                    >
                      {resource.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="inline-block bg-blue-200 text-blue-800 text-xs font-semibold mr-2 px-1 py-0.5 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </td>
                    <td
                      className={`p-3 border ${
                        isDarkTheme ? "text-gray-300" : ""
                      }`}
                    >
                      <button
                        onClick={() => handleEditResource(resource)}
                        className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-1 px-2 rounded focus:outline-none focus:shadow-outline mr-2"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteResource(resource._id)}
                        className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-2 rounded focus:outline-none focus:shadow-outline"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination for Resources */}
        <div className="mt-4">
          <button
            disabled={resourcePage <= 1}
            onClick={() => setResourcePage(resourcePage - 1)}
            className="mr-2 bg-gray-300 hover:bg-gray-400 py-1 px-2 rounded"
          >
            Previous
          </button>
          <button
            disabled={resourcePage * 10 >= resourceTotal}
            onClick={() => setResourcePage(resourcePage + 1)}
            className="bg-gray-300 hover:bg-gray-400 py-1 px-2 rounded"
          >
            Next
          </button>
        </div>

        {/* Requested Resources Section */}
        <div
          className={`mt-8 shadow-md rounded-lg p-6 ${
            isDarkTheme ? "bg-gray-800" : "bg-white"
          }`}
        >
          <h2
            className={`text-2xl font-bold mb-4 ${
              isDarkTheme ? "text-gray-50" : "text-gray-800"
            }`}
          >
            Requested Resources
          </h2>
          <form className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                className={`block text-sm font-bold ${
                  isDarkTheme ? "text-gray-400" : "text-gray-600"
                }`}
              >
                Your Name
              </label>
              <input
                type="text"
                className={`w-full p-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  isDarkTheme
                    ? "border-gray-600 bg-gray-700"
                    : "border-gray-300"
                }`}
                value={newRequestUserName}
                onChange={(e) => setNewRequestUserName(e.target.value)}
              />
            </div>
            <div>
              <label
                className={`block text-sm font-bold ${
                  isDarkTheme ? "text-gray-400" : "text-gray-600"
                }`}
              >
                Resource Name
              </label>
              <input
                type="text"
                className={`w-full p-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  isDarkTheme
                    ? "border-gray-600 bg-gray-700"
                    : "border-gray-300"
                }`}
                value={newRequestResourceName}
                onChange={(e) => setNewRequestResourceName(e.target.value)}
              />
            </div>
            <div>
              <label
                className={`block text-sm font-bold ${
                  isDarkTheme ? "text-gray-400" : "text-gray-600"
                }`}
              >
                Type
              </label>
              <select
                className={`w-full p-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  isDarkTheme
                    ? "border-gray-600 bg-gray-700"
                    : "border-gray-300"
                }`}
                value={newRequestResourceType}
                onChange={(e) => setNewRequestResourceType(e.target.value)}
              >
                <option>Select Type</option>
                <option value="Documentation">Documentation</option>
                <option value="Video">Video</option>
                <option value="Article">Article</option>
                <option value="Tool">Tool</option>
              </select>
            </div>
            <div>
              <label
                className={`block text-sm font-bold ${
                  isDarkTheme ? "text-gray-400" : "text-gray-600"
                }`}
              >
                Request Date
              </label>
              <input
                type="date"
                className={`w-full p-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  isDarkTheme
                    ? "border-gray-600 bg-gray-700"
                    : "border-gray-300"
                }`}
                value={newRequestDate}
                onChange={(e) => setNewRequestDate(e.target.value)}
              />
            </div>
          </form>
          <div className="text-right mt-4">
            <button
              onClick={handleAddRequest}
              className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg shadow focus:outline-none focus:shadow-outline font-bold"
            >
              Request Resource
            </button>
          </div>

          <div
            className={`overflow-x-auto mt-8 ${
              isDarkTheme ? "bg-gray-800" : "bg-white"
            }`}
          >
            <table className="min-w-full border-collapse">
              <thead>
                <tr className={isDarkTheme ? "bg-gray-700" : "bg-gray-100"}>
                  <th
                    className={`p-3 text-left text-sm font-bold ${
                      isDarkTheme ? "text-gray-400" : "text-gray-600"
                    } border`}
                  >
                    User Name
                  </th>
                  <th
                    className={`p-3 text-left text-sm font-bold ${
                      isDarkTheme ? "text-gray-400" : "text-gray-600"
                    } border`}
                  >
                    Resource Name
                  </th>
                  <th
                    className={`p-3 text-left text-sm font-bold ${
                      isDarkTheme ? "text-gray-400" : "text-gray-600"
                    } border`}
                  >
                    Type
                  </th>
                  <th
                    className={`p-3 text-left text-sm font-bold ${
                      isDarkTheme ? "text-gray-400" : "text-gray600"
                    } border`}
                  >
                    Request Date
                  </th>
                  <th
                    className={`p-3 text-left text-sm font-bold ${
                      isDarkTheme ? "text-gray-400" : "text-gray-600"
                    } border`}
                  >
                    Status
                  </th>
                  <th
                    className={`p-3 text-left text-sm font-bold ${
                      isDarkTheme ? "text-gray-400" : "text-gray-600"
                    } border`}
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => (
                  <tr
                    key={request._id}
                    className={`hover:bg-gray-100 ${
                      isDarkTheme ? "hover:bg-gray-800" : ""
                    }`}
                  >
                    <td
                      className={`p-3 border ${
                        isDarkTheme ? "text-gray-300" : ""
                      }`}
                    >
                      {request.userName}
                    </td>
                    <td
                      className={`p-3 border ${
                        isDarkTheme ? "text-gray-300" : ""
                      }`}
                    >
                      {request.resourceName}
                    </td>
                    <td
                      className={`p-3 border ${
                        isDarkTheme ? "text-gray-300" : ""
                      }`}
                    >
                      {request.resourceType}
                    </td>
                    <td
                      className={`p-3 border ${
                        isDarkTheme ? "text-gray-300" : ""
                      }`}
                    >
                      {formatDate(request.requestDate)}
                    </td>
                    <td
                      className={`p-3 border ${
                        isDarkTheme ? "text-gray-300" : ""
                      }`}
                    >
                      <span
                        className={`font-bold ${
                          request.status === "approved"
                            ? "text-green-500"
                            : "text-yellow-500"
                        }`}
                      >
                        {request.status}
                      </span>
                    </td>
                    <td
                      className={`p-3 border ${
                        isDarkTheme ? "text-gray-300" : ""
                      }`}
                    >
                      <button
                        onClick={() =>
                          handleRequestStatusChange(
                            request._id,
                            request.status === "pending"
                              ? "approved"
                              : "pending"
                          )
                        }
                        className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-1 px-2 rounded focus:outline-none focus:shadow-outline"
                      >
                        Toggle Status
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ThemeProvider>
  );
};

export default ResourceTable;

