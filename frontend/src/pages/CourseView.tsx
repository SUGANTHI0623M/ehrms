import { useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import MainLayout from "@/components/MainLayout";
import { Play } from "lucide-react";

const CourseView = () => {
  const { courseName } = useParams();
  const navigate = useNavigate();

  return (
    <MainLayout>
      <main className="p-6 space-y-6">
        <button
          onClick={() => navigate(-1)}
          className="text-sm border px-3 py-1 rounded hover:bg-muted"
        >
          Back
        </button>

        {/* VIDEO PLAYER */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <video controls className="w-full rounded-lg">
              <source src="https://filesamples.com/samples/video/mp4/sample_960x400_ocean_with_audio.mp4" />
            </video>

            {/* Navigation Buttons */}
            <div className="flex justify-center gap-3">
              <button className="border px-4 py-2 rounded">⏮ Prev</button>
              <button className="border px-4 py-2 rounded flex items-center gap-2">
                <Play size={16} /> Play
              </button>
              <button className="border px-4 py-2 rounded">⏭ Next</button>
            </div>

            <div>
              <h3 className="font-bold text-lg">{courseName}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{courseName}</p>
            </div>
          </div>

          {/* Course Lessons */}
          <Card className="p-4 space-y-2 h-fit">
            <h3 className="font-semibold text-lg mb-2">Course Lessons</h3>
            {["Lesson 1", "Lesson 2", "Lesson 3", "Lesson 4"].map((l) => (
              <div key={l} className="border rounded px-3 py-2 hover:bg-muted cursor-pointer">
                {l}
              </div>
            ))}
          </Card>
        </div>

        {/* DETAILS SECTION */}
        <Card className="p-6 space-y-4">
          <h2 className="font-bold text-xl">{courseName}</h2>

          <div>
            <h4 className="font-semibold">About this Course</h4>
            <p className="text-sm">Course Description Here</p>
          </div>

          <div>
            <h4 className="font-semibold">Course Details</h4>
            <ul className="text-sm space-y-1">
              <li>📄 Course PDF</li>
              <li>⏱ Duration: 60 mins</li>
              <li>🎬 Lessons: 4</li>
            </ul>
          </div>
        </Card>
      </main>
    </MainLayout>
  );
};

export default CourseView;
