"use client";
import { useState, useEffect } from "react";
import axios from "axios";
import Link from "next/link";
import Image from "next/image";
import checkListImage from "../../public/check-list.png";

interface Quiz {
  _id: string;
  title: string;
}

export default function Home() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);

  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_QUIZ_SERVICE_URL}/quizzes`
        );
        console.log("response", response);
        setQuizzes(response.data);
      } catch (error) {
        console.error("Error fetching quizzes:", error);
      }
    };
    fetchQuizzes();
  }, []);

  return (
    <div className="container mx-auto p-4 mt-10">
      <div className="flex justify-center items-center mb-20">
        <h1 className="text-[64px] font-bold text-primary">Select a Quiz</h1>
      </div>
      <ul className="flex flex-wrap justify-center gap-12">
        {quizzes.map((quiz) => (
          <li
            key={quiz._id}
            className="bg-white shadow-[4px_4px_12px_#95C0CE] rounded-3xl p-4 w-[275px] h-[300px] flex flex-col items-center justify-between"
          >
            <div className="flex-grow flex items-center justify-center">
              <Image
                src={checkListImage}
                alt="Check List"
                width={100}
                height={100}
              />
            </div>
            <div className="text-black text-xl text-center mb-3">{quiz.title}</div>
            <Link
              href={`/quiz/${quiz._id}`}
              className="bg-primary text-white py-2 px-4 rounded-lg hover:bg-opacity-90 transition-colors"
            >
              Join Contest
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
