import { useParams } from "react-router-dom";
import MainLayout from "@/components/MainLayout";
import { InterviewSession } from "./InterviewSession";

const InterviewRoundScreen = () => {
  const { interviewId } = useParams<{ interviewId: string }>();

  return (
    <MainLayout>
      <div className="p-6">
        <div className="mx-auto max-w-5xl">
          {interviewId ? <InterviewSession interviewId={interviewId} /> : <div>Invalid Interview ID</div>}
        </div>
      </div>
    </MainLayout>
  );
};

export default InterviewRoundScreen;
