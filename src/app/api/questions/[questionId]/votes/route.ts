// API endpoint for answer voting system
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/db";

type RouteContext =
  | { params: { questionId: string } }
  | { params: Promise<{ questionId: string }> };

// GET /api/questions/[questionId]/votes
// Returns vote counts for current rotation and historical rotations
export async function GET(_request: NextRequest, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { questionId } = await Promise.resolve(context.params);

  try {
    // Get the question to check if it exists and if voting is enabled
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      select: { id: true, isAnswerConfirmed: true },
    });

    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    // Get all votes for this question (non-archived only)
    const votes = await prisma.answerVote.findMany({
      where: {
        questionId,
        isArchived: false,
      },
      select: {
        academicYear: true,
        rotationNumber: true,
        rotationName: true,
        selectedAnswer: true,
        isFinal: true,
      },
    });

    // Get user's current vote if they have one
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        rotation: true,
        rotationNumber: true,
        gradYear: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get current rotation period (if exists)
    const currentPeriod = user.rotation && user.rotationNumber && user.gradYear
      ? await prisma.rotationPeriod.findFirst({
          where: {
            academicYear: user.gradYear,
            rotationNumber: user.rotationNumber,
            rotationName: user.rotation,
            isActive: true,
          },
        })
      : null;

    // Check if user can vote (matching rotation + active period + answer not confirmed)
    const canVote = !question.isAnswerConfirmed &&
      !!currentPeriod &&
      !!user.rotation &&
      !!user.rotationNumber &&
      !!user.gradYear &&
      new Date() <= new Date(currentPeriod.endDate);

    // Get user's current vote
    const userVote = user.rotation && user.rotationNumber && user.gradYear
      ? await prisma.answerVote.findUnique({
          where: {
            questionId_userId_academicYear_rotationNumber_rotationName: {
              questionId,
              userId: user.id,
              academicYear: user.gradYear,
              rotationNumber: user.rotationNumber,
              rotationName: user.rotation,
            },
          },
          select: { selectedAnswer: true },
        })
      : null;

    // Group votes by rotation period
    const votesByPeriod: Record<string, Record<string, number>> = {};
    votes.forEach((vote: { academicYear: number; rotationNumber: string; rotationName: string; selectedAnswer: string; isFinal: boolean }) => {
      const periodKey = `${vote.academicYear}-${vote.rotationNumber}-${vote.rotationName}`;
      if (!votesByPeriod[periodKey]) {
        votesByPeriod[periodKey] = { A: 0, B: 0, C: 0, D: 0, E: 0 };
      }
      votesByPeriod[periodKey][vote.selectedAnswer] = (votesByPeriod[periodKey][vote.selectedAnswer] || 0) + 1;
    });

    // Format for response
    const formattedVotes = Object.entries(votesByPeriod).map(([periodKey, counts]) => {
      const [academicYear, rotationNumber, rotationName] = periodKey.split("-");
      const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
      
      return {
        academicYear: parseInt(academicYear),
        rotationNumber,
        rotationName,
        counts,
        total,
        percentages: {
          A: total > 0 ? Math.round((counts.A / total) * 100) : 0,
          B: total > 0 ? Math.round((counts.B / total) * 100) : 0,
          C: total > 0 ? Math.round((counts.C / total) * 100) : 0,
          D: total > 0 ? Math.round((counts.D / total) * 100) : 0,
          E: total > 0 ? Math.round((counts.E / total) * 100) : 0,
        },
      };
    });

    // Separate current period from historical
    const currentPeriodKey = user.rotation && user.rotationNumber && user.gradYear
      ? `${user.gradYear}-${user.rotationNumber}-${user.rotation}`
      : null;

    const currentVotes = formattedVotes.find((v) => 
      `${v.academicYear}-${v.rotationNumber}-${v.rotationName}` === currentPeriodKey
    ) || null;

    const historicalVotes = formattedVotes.filter((v) =>
      `${v.academicYear}-${v.rotationNumber}-${v.rotationName}` !== currentPeriodKey
    );

    const response = {
      canVote,
      userVote: userVote?.selectedAnswer || null,
      currentVotes,
      historicalVotes,
      isAnswerConfirmed: question.isAnswerConfirmed,
    };

    console.warn('🗳️ [VOTING API] Response for question', questionId, ':', {
      canVote,
      hasUserVote: !!userVote,
      hasCurrentVotes: !!currentVotes,
      currentVotesTotal: currentVotes?.total || 0,
      historicalCount: historicalVotes.length,
      isAnswerConfirmed: question.isAnswerConfirmed,
      userRotation: `${user.gradYear}-${user.rotationNumber}-${user.rotation}`,
      hasPeriod: !!currentPeriod
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error("[votes/GET] Error fetching votes:", error);
    return NextResponse.json(
      { error: "Failed to fetch votes" },
      { status: 500 }
    );
  }
}

// POST /api/questions/[questionId]/votes
// Cast or update a vote
export async function POST(request: NextRequest, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { questionId } = await Promise.resolve(context.params);

  try {
    const body = await request.json();
    const { selectedAnswer } = body;

    // Validate answer choice
    if (!["A", "B", "C", "D", "E"].includes(selectedAnswer)) {
      return NextResponse.json(
        { error: "Invalid answer choice" },
        { status: 400 }
      );
    }

    // Get user details
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        rotation: true,
        rotationNumber: true,
        gradYear: true,
      },
    });

    if (!user || !user.rotation || !user.rotationNumber || !user.gradYear) {
      return NextResponse.json(
        { error: "User must have rotation, rotation number, and graduation year set in profile" },
        { status: 400 }
      );
    }

    // Check if question exists and is not confirmed
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      select: { id: true, isAnswerConfirmed: true },
    });

    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    if (question.isAnswerConfirmed) {
      return NextResponse.json(
        { error: "Cannot vote on confirmed answers" },
        { status: 400 }
      );
    }

    // Get current rotation period
    const currentPeriod = await prisma.rotationPeriod.findFirst({
      where: {
        academicYear: user.gradYear,
        rotationNumber: user.rotationNumber,
        rotationName: user.rotation,
        isActive: true,
      },
    });

    if (!currentPeriod) {
      return NextResponse.json(
        { error: "No active rotation period found for your current rotation" },
        { status: 400 }
      );
    }

    // Check if period has ended
    if (new Date() > new Date(currentPeriod.endDate)) {
      return NextResponse.json(
        { error: "Voting period has ended for this rotation" },
        { status: 400 }
      );
    }

    // Upsert the vote
    const vote = await prisma.answerVote.upsert({
      where: {
        questionId_userId_academicYear_rotationNumber_rotationName: {
          questionId,
          userId: user.id,
          academicYear: user.gradYear,
          rotationNumber: user.rotationNumber,
          rotationName: user.rotation,
        },
      },
      update: {
        selectedAnswer,
        isFinal: false, // Not final until period ends
      },
      create: {
        questionId,
        userId: user.id,
        academicYear: user.gradYear,
        rotationNumber: user.rotationNumber,
        rotationName: user.rotation,
        selectedAnswer,
        isFinal: false,
      },
    });

    return NextResponse.json({ success: true, vote });
  } catch (error) {
    console.error("[votes/POST] Error creating/updating vote:", error);
    return NextResponse.json(
      { error: "Failed to save vote" },
      { status: 500 }
    );
  }
}
