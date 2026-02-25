import { useParams } from "react-router-dom";
import { InterviewSession } from "./InterviewSession";

const InterviewRoundScreen = () => {
  const { interviewId } = useParams<{ interviewId: string }>();

  return (
    <div className="p-6">
      <div className="mx-auto max-w-5xl">
        {interviewId ? (
          <InterviewSession interviewId={interviewId} />
        ) : (
          <div>Invalid Interview ID</div>
        )}
      </div>
    </div>
  );
};

export default InterviewRoundScreen;
