import { StatusCodes } from "http-status-codes";
import { Request, Response } from "express";
import { giveCurrentDateTime } from "../utils/upload-file.js";
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { storage } from "../config/firebase.config.js";
import { ProofOfLevelRequestModel } from "../models/proofOfLevelRequest.model.js";
import { ProofOfLevelModel } from "../models/proofOfLevel.model.js";
import { NotFoundError } from "../errors/not-found.error.js";
import { RequestState } from "../utils/const.js";
import { findAndUpdateTutor } from "../service/tutor.service.js";
import { TutorModel } from "../models/tutor.model.js";
import { BadRequestError } from "../errors/bad-request.error.js";
import { processFileMiddleware } from "../middlewares/upload.middleware.js";

//@description     Get or Search all tutors
//@route           GET /api/v1/tutor?search=&subjectId=
//@access          Public
export const sendProofOfLevelRequest = async (req: Request, res: Response) => {
  await processFileMiddleware(req, res);

  const { subjectId, noteOfSender } = req.body;

  if (!subjectId)
    return res.status(StatusCodes.BAD_REQUEST).json({
      msg: "Subject is required!",
    });

  const tutor = await TutorModel.findOne({
    user: res.locals.userData.user,
  }).populate("proofsOfLevel");

  if (tutor.proofsOfLevel.some((proof: any) => proof.subject === subjectId)) {
    throw new BadRequestError(
      "Proof of level for this subject already exists!"
    );
  }

  let documents: any[] = [];
  if (req.files && "documents" in req.files && req.files.documents) {
    documents = await Promise.all(
      req.files.documents.map(async (file) => {
        try {
          const dateTime = giveCurrentDateTime();

          const storageRef = ref(
            storage,
            `users/${res.locals.userData.user}/proofs-of-level/${subjectId}/${
              dateTime + "___" + file.originalname
            }`
          );

          // Create file metadata including the content type
          const metadata = {
            contentType: file.mimetype,
          };

          // Upload the file in the bucket storage
          const url = await uploadBytesResumable(
            storageRef,
            file.buffer,
            metadata
          ).then(async (snapshot) => {
            return await getDownloadURL(snapshot.ref).then((url) => url);
          });

          return url;
        } catch (error: any) {
          return res.status(400).send(error.message);
        }
      })
    );
  }

  if (documents.length == 0)
    return res.status(StatusCodes.BAD_REQUEST).json({
      msg: "Documents required!",
    });

  const request = await ProofOfLevelRequestModel.create({
    subject: subjectId,
    sender: res.locals.userData.user,
    documentURLs: documents,
    noteOfSender,
  });

  return res.status(StatusCodes.CREATED).json({
    data: { request: request },
  });
};

//@description     Get or Search all tutors
//@route           GET /api/v1/tutor?search=&subjectId=
//@access          Public
export const getUserProofsOfLevel = async (req: Request, res: Response) => {
  let proofs = await ProofOfLevelModel.find({
    user: res.locals.userData.user,
    isDeleted: false,
  });

  return res.status(StatusCodes.OK).json({
    data: {
      proofs,
    },
  });
};

//@description     Get or Search all tutors
//@route           GET /api/v1/tutor?search=&subjectId=
//@access          Public
export const getAllProofOfLevelRequest = async (
  req: Request,
  res: Response
) => {
  let requests = await ProofOfLevelRequestModel.find({});

  return res.status(StatusCodes.CREATED).json({
    data: {
      requests,
    },
  });
};

//@description     Get or Search all tutors
//@route           GET /api/v1/tutor?search=&subjectId=
//@access          Public
export const acceptProofOfLevelRequest = async (
  req: Request,
  res: Response
) => {
  const { requestId, noteOfReviewer } = req.body as any;

  let request = await ProofOfLevelRequestModel.findById(requestId);

  if (!request || request.state != RequestState.WAITING) {
    throw new NotFoundError("Request not found!");
  }

  request.state = RequestState.ACCEPTED;
  request.noteOfReviewer = noteOfReviewer;
  await request.save();

  const proof = await ProofOfLevelModel.create({
    user: request.sender,
    subject: request.subject,
    documentURLs: request.documentURLs,
    noteOfSender: request.noteOfSender,
    request: request._id,
  });

  await findAndUpdateTutor(
    { user: request.sender },
    {
      $push: {
        proofsOfLevel: proof._id,
      },
    }
  );

  return res.status(StatusCodes.CREATED).json({
    msg: "Request accepted!",
    data: {
      proofOfLevel: proof,
    },
  });
};

//@description     Get or Search all tutors
//@route           GET /api/v1/tutor?search=&subjectId=
//@access          Public
export const rejectProofOfLevelRequest = async (
  req: Request,
  res: Response
) => {
  const { requestId, noteOfReviewer } = req.body as any;

  let request = await ProofOfLevelRequestModel.findById(requestId);

  if (!request || request.state != RequestState.WAITING) {
    throw new NotFoundError("Request not found!");
  }

  request.state = RequestState.REJECTED;
  request.noteOfReviewer = noteOfReviewer;
  await request.save();

  return res.status(StatusCodes.CREATED).json({
    msg: "Request rejected!",
  });
};

//@description     Get or Search all tutors
//@route           GET /api/v1/tutor?search=&subjectId=
//@access          Public
export const deleteProofOfLevel = async (req: Request, res: Response) => {
  const { proofOfLevelId } = req.body as any;

  let proof = await ProofOfLevelModel.findOne({
    _id: proofOfLevelId,
    isDeleted: false,
  });

  if (!proof) {
    throw new NotFoundError("Proof of level not found!");
  }

  await findAndUpdateTutor(
    {
      user: proof.user,
    },
    {
      $pull: { proofsOfLevel: proofOfLevelId },
    }
  );

  await proof.delete();

  return res.status(StatusCodes.CREATED).json({
    msg: "Request rejected!",
  });
};