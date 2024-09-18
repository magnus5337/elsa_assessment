"use client";
import { useState, useEffect } from "react";
import axios from "axios";
import { io, Socket } from "socket.io-client";
import Link from "next/link";

interface Question {
  questionId: string;
  question: string;
  answers: { id: string; text: string }[];
}

interface Participant {
  userId: string;
  score: number;
}

interface Quiz {
  _id: string;
  title: string;
  questions: Question[];
  participants: Participant[];
}

export default function QuizContest({ params }: { params: { id: string } }) {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [userId, setUserId] = useState("");
  const [leaderboard, setLeaderboard] = useState<Participant[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const joinResponse = await axios.post(
          `${process.env.NEXT_PUBLIC_QUIZ_SERVICE_URL}/quizzes/${params.id}/join`
        );
        const { userId, quiz } = joinResponse.data;
        setUserId(userId);
        setQuiz(quiz);
        setLeaderboard(quiz.participants);

        const newSocket = io(`${process.env.NEXT_PUBLIC_MESSAGE_SERVICE_URL}`, {
          withCredentials: true,
          transports: ["websocket"],
        });
        setSocket(newSocket);

        newSocket.on("connect", () => {
          newSocket.emit("join", { userId, quizId: params.id });
        });
      } catch (error) {
        console.error("Error fetching quiz:", error);
      }
    };
    fetchQuiz();

    return () => {
      if (socket) {
        console.log("Disconnecting socket");
        socket.disconnect();
        socket.close();
      }
    };
  }, [params.id]);

  useEffect(() => {
    if (socket) {
      socket.on("quizUpdate", (data: { userId: string; score: number }) => {
        setLeaderboard((prevLeaderboard) => {
          const updatedLeaderboard = prevLeaderboard?.map((participant) =>
            participant.userId === data.userId
              ? { ...participant, score: data.score }
              : participant
          );
          return updatedLeaderboard?.sort((a, b) => b.score - a.score);
        });
      });

      socket.on("userJoined", (userId: string) => {
        setLeaderboard((prevLeaderboard) => {
          if (
            !prevLeaderboard?.some(
              (participant) => participant.userId === userId
            )
          ) {
            if (prevLeaderboard) {
              return [...prevLeaderboard, { userId, score: 0 }].sort(
                (a, b) => b.score - a.score
              );
            }
          }
          return prevLeaderboard;
        });
      });

      socket.on("userLeft", (userId: string) => {
        setLeaderboard((prevLeaderboard) => {
          return prevLeaderboard?.filter(
            (participant) => participant.userId !== userId
          );
        });
      });
    }

    return () => {
      if (socket) {
        socket.off("quizUpdate");
        socket.off("userJoined");
        socket.off("userLeft");
      }
    };
  }, [socket]);

  const handleSubmit = async () => {
    if (selectedAnswer && quiz) {
      try {
        await axios.post(
          `${process.env.NEXT_PUBLIC_QUIZ_SERVICE_URL}/quizzes/${params.id}/submit`,
          {
            userId,
            quizId: params.id,
            questionId: quiz.questions[currentQuestionIndex].questionId,
            answerId: selectedAnswer,
          }
        );
        if (currentQuestionIndex < quiz.questions.length - 1) {
          setCurrentQuestionIndex(currentQuestionIndex + 1);
          setSelectedAnswer("");
        }
      } catch (error) {
        console.error("Error submitting answer:", error);
      }
    }
  };

  if (!quiz) return <div>Loading...</div>;

  const currentQuestion = quiz.questions[currentQuestionIndex];

  return (
    <div className="container mx-auto p-4 text-black">
      <Link
        href="/"
        className="text-primary hover:underline mb-10 inline-block"
        onClick={() => {
          console.log("Disconnecting socket",socket);
          if (socket) {
            socket.disconnect();
            socket.close();
          }
        }}
      >
        ← Back
      </Link>
      <div className="flex items-center mb-8 gap-10">
        <div>
          <span className="font-bold mr-2">Name</span>
          <span>{userId.slice(0, 6)}</span>
        </div>
        <div>
          <span className="font-bold mr-2">Score</span>
          <span>
            {leaderboard?.find((participant) => participant.userId === userId)
              ?.score || 0}
          </span>
        </div>
        <div>
          <span className="font-bold mr-2">Rank</span>
          <span>
            {leaderboard?.findIndex(
              (participant) => participant.userId === userId
            ) + 1 || "-"}
          </span>
        </div>
      </div>
      <div className="flex w-full h-full gap-10">
        <div className="flex-grow bg-white shadow-[4px_4px_12px_#95C0CE] rounded-lg p-6 h-full">
          <h2 className="text-2xl font-bold mb-4">Question</h2>
          <p className="text-lg mb-6">{currentQuestion.question}</p>
          {currentQuestion.answers.map((answer) => (
            <div key={answer.id} className="mb-4">
              <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="answer"
                  value={answer.id}
                  checked={selectedAnswer === answer.id}
                  onChange={(e) => setSelectedAnswer(e.target.value)}
                  className="mr-3"
                />
                <span>{answer.text}</span>
              </label>
            </div>
          ))}
          <button
            onClick={handleSubmit}
            className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-opacity-90 transition-colors mt-4 float-right"
          >
            Next →
          </button>
        </div>
        <div className="flex-shrink-0 w-[250px] lg:w-[300px] xl:w-[400px] bg-white shadow-[4px_4px_12px_#95C0CE] rounded-lg p-6">
          <h3 className="text-2xl font-bold mb-4">Leaderboard</h3>
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left">Rank</th>
                <th className="text-left">Name</th>
                <th className="text-right">Score</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard?.map((participant, index) => (
                <tr key={participant.userId} className="border-t">
                  <td className={`py-2 ${
                    index === 0 ? 'text-yellow-500 font-bold' :
                    index === 1 ? 'text-amber-700' :
                    index === 2 ? 'text-green-600' : ''
                  }`}>{index + 1}</td>
                  <td className={
                    index === 0 ? 'text-yellow-500 font-bold' :
                    index === 1 ? 'text-amber-700' :
                    index === 2 ? 'text-green-600' : ''
                  }>{participant.userId.slice(0, 6)}</td>
                  <td className={`text-right ${
                    index === 0 ? 'text-yellow-500 font-bold' :
                    index === 1 ? 'text-amber-700' :
                    index === 2 ? 'text-green-600' : ''
                  }`}>{participant.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
