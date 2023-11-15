const model = require("../../models");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const cloudinary = require("../../utils/cloudinary");
const transporter = require("../../utils/nodemailer");
const fs = require("fs");
const mustache = require("mustache");
const redis = require("../../utils/redis");
const Op = require("sequelize").Op;

module.exports = {
  // get users
  getProfile: async (req, res) => {
    try {
      const authorization = req.headers.authorization.slice(6).trim();
      const { id } = jwt.verify(authorization, process.env.APP_SECRET_KEY);

      const request = await model.users.findOne({
        where: { id },
      });

      res.status(200).json({
        status: "OK",
        messages: "Get profile success",
        data: request,
      });
    } catch (error) {
      res.status(error?.code ?? 500).json({
        status: "ERROR",
        messages: error?.message ?? "Something wrong in our server",
        data: null,
      });
    }
  },
  // edit users
  editProfile: async (req, res) => {
    try {
      const requestBody = req.body;

      const authorization = req.headers.authorization.slice(6).trim();
      const { id } = jwt.verify(authorization, process.env.APP_SECRET_KEY);

      const payload = {
        fullname: requestBody?.fullname,
        company: requestBody?.company,
        job_title: requestBody?.job_title,
        phone: requestBody?.phone,
        description: requestBody?.description,
        domicile: requestBody?.domicile,
      };

      await model.users.update(payload, {
        where: { id },
      });

      res.status(200).json({
        status: "OK",
        messages: "Edit profile success",
        data: payload,
      });
    } catch (error) {
      res.status(error?.code ?? 500).json({
        status: "ERROR",
        messages: error?.message ?? "Something wrong in our server",
        data: null,
      });
    }
  },
  editProfilePicture: async (req, res) => {
    try {
      const { photo } = req?.files ?? {};

      const authorization = req.headers.authorization.slice(6).trim();
      const { id } = jwt.verify(authorization, process.env.APP_SECRET_KEY);

      let mimeType = photo.mimetype.split("/")[1];
      let allowFile = ["jpeg", "jpg", "png", "webp"];

      // cari apakah tipe data yang di upload terdapat salah satu dari list yang ada diatas
      if (!allowFile?.find((item) => item === mimeType)) {
        res.status(400).send({
          status: false,
          message: "Only accept jpeg, jpg, png, webp",
        });
      }

      // validate size image
      if (photo.size > 2000000) {
        res.status(400).send({
          status: false,
          message: "File to big, max size 2MB",
        });
      }

      const upload = await cloudinary.uploader.upload(photo.tempFilePath, {
        public_id: new Date().toISOString(),
      });

      const request = await model.users.findOne({
        where: { id },
      });

      const payload = {
        ...request?.dataValues,
        photo: upload?.secure_url,
      };

      await model.users.update(payload, {
        where: { id },
      });

      res.status(200).json({
        status: "OK",
        messages: "Edit photo profile",
        data: payload,
      });
    } catch (error) {
      console.log(error);
      res.status(error?.code ?? 500).json({
        status: "ERROR",
        messages: error?.message ?? "Something wrong in our server",
        data: null,
      });
    }
  },
  // add skills
  addSkills: async (req, res) => {
    try {
      const requestBody = req.body;

      const authorization = req.headers.authorization.slice(6).trim();
      const { id } = jwt.verify(authorization, process.env.APP_SECRET_KEY);

      const request = await model.users.findOne({
        where: { id },
      });

      const skills = request?.dataValues?.skills ?? [];
      const uniq = [...new Set([...skills, ...requestBody?.skills])];

      const payload = {
        ...request?.dataValues,
        skills: uniq,
      };

      await model.users.update(payload, {
        where: { id },
      });

      res.status(200).json({
        status: "OK",
        messages: "Add Skills Success",
        data: req.body,
      });
    } catch (error) {
      res.status(error?.code ?? 500).json({
        status: "ERROR",
        messages: error?.message ?? "Something wrong in our server",
        data: null,
      });
    }
  },
  // delete skills
  deleteSkills: async (req, res) => {
    try {
      const deleteId = req.params.id;

      const authorization = req.headers.authorization.slice(6).trim();
      const { id } = jwt.verify(authorization, process.env.APP_SECRET_KEY);

      const request = await model.users.findOne({
        where: { id },
      });

      if (!request.dataValues.skills[deleteId]) {
        throw {
          message: "Skills id not found",
          code: 400,
        };
      }

      let skills = request.dataValues.skills;

      skills = skills.filter((item, key) => key != deleteId);

      await model.users.update(
        { skills },
        {
          where: { id },
        }
      );

      res.status(200).json({
        status: "OK",
        messages: "Delete Skills Success",
        data: skills,
      });
    } catch (error) {
      res.status(error?.code ?? 500).json({
        status: "ERROR",
        messages: error?.message ?? "Something wrong in our server",
        data: null,
      });
    }
  },
  // add job
  addJob: async (req, res) => {
    try {
      const requestBody = req.body;
      const { photo } = req?.files ?? {};

      const authorization = req.headers.authorization.slice(6).trim();
      const { id } = jwt.verify(authorization, process.env.APP_SECRET_KEY);

      const request = await model.users.findOne({
        where: { id },
      });

      const job_history = request?.dataValues?.job_history ?? [];

      let mimeType = photo.mimetype.split("/")[1];
      let allowFile = ["jpeg", "jpg", "png", "webp"];

      // cari apakah tipe data yang di upload terdapat salah satu dari list yang ada diatas
      if (!allowFile?.find((item) => item === mimeType)) {
        res.status(400).send({
          status: false,
          message: "Only accept jpeg, jpg, png, webp",
        });
      }

      // validate size image
      if (photo.size > 2000000) {
        res.status(400).send({
          status: false,
          message: "File to big, max size 2MB",
        });
      }

      const upload = await cloudinary.uploader.upload(photo.tempFilePath, {
        public_id: new Date().toISOString(),
      });

      const payload = {
        job_history: [
          ...job_history,
          ...[
            {
              id: uuidv4(),
              logo: upload?.secure_url,
              position: requestBody?.position,
              company: requestBody?.company,
              date: requestBody?.date,
              description: requestBody?.description,
            },
          ],
        ],
      };

      await model.users.update(payload, {
        where: { id },
      });

      res.status(200).json({
        status: "OK",
        messages: "Add new job",
        data: payload?.job_history,
      });
    } catch (error) {
      console.log(error);
      res.status(error?.code ?? 500).json({
        status: "ERROR",
        messages: error?.message ?? "Something wrong in our server",
        data: null,
      });
    }
  },
  // delete job
  deleteJob: async (req, res) => {
    try {
      const deleteId = req.params.id;

      const authorization = req.headers.authorization.slice(6).trim();
      const { id } = jwt.verify(authorization, process.env.APP_SECRET_KEY);

      const request = await model.users.findOne({
        where: { id },
      });

      let job_history = request?.dataValues?.job_history ?? [];

      if (job_history.filter((res) => res.id === deleteId).length === 0) {
        throw {
          message: "Job id not found",
          code: 400,
        };
      }

      job_history = job_history.filter((item) => item?.id != deleteId);

      await model.users.update(
        { job_history },
        {
          where: { id },
        }
      );

      res.status(200).json({
        status: "OK",
        messages: "Delete job Success",
        data: job_history,
      });
    } catch (error) {
      res.status(error?.code ?? 500).json({
        status: "ERROR",
        messages: error?.message ?? "Something wrong in our server",
        data: null,
      });
    }
  },
  // add contact
  addContact: async (req, res) => {
    try {
      let request,
        cache = false;
      const target_id = req.params.id;
      const requestBody = req.body;

      const authorization = req.headers.authorization.slice(6).trim();
      const { id, fullname } = jwt.verify(
        authorization,
        process.env.APP_SECRET_KEY
      );

      const checkRedis = await redis.get(`target_id_${target_id}`);

      if (checkRedis && checkRedis !== "null") {
        cache = true;
        request = { dataValues: JSON.parse(checkRedis) };
      } else {
        request = await model.users.findOne({
          where: { id: target_id },
        });

        redis.set(`target_id_${target_id}`, JSON.stringify(request), "EX", 60);
      }

      if (!request) {
        throw {
          cache,
          message: "User target not found",
          code: 400,
        };
      }

      const template = fs.readFileSync("./template/contact.html", {
        encoding: "utf-8",
      });

      const mailOptions = {
        from: "bilkisismail07@gmail.com",
        to: request?.dataValues?.email,
        subject: requestBody?.subject,
        html: mustache.render(template, {
          subject: requestBody?.subject,
          body: requestBody?.description,
          sender: fullname,
          name: request?.dataValues?.fullname,
        }),
      };

      await transporter.sendMail(mailOptions);

      await model.contact.create({
        ...requestBody,
        created_by: id,
        user_id: target_id,
      });

      res.status(200).json({
        cache,
        status: "OK",
        messages: "Contact success",
        data: null,
      });
    } catch (error) {
      res.status(error?.code ?? 500).json({
        cache: error?.cache,
        status: "ERROR",
        messages: error?.message ?? "Something wrong in our server",
        data: null,
      });
    }
  },
  // add contact
  addContactManual: async (req, res) => {
    try {
      let request,
        cache = false;
      const target_id = req.params.id;
      const requestBody = req.body;

      const authorization = req.headers.authorization.slice(6).trim();
      const { id, fullname } = jwt.verify(
        authorization,
        process.env.APP_SECRET_KEY
      );

      const template = fs.readFileSync("./template/contact.html", {
        encoding: "utf-8",
      });

      const mailOptions = {
        from: "bilkisismail07@gmail.com",
        to: requestBody?.to,
        subject: requestBody?.subject,
        html: mustache.render(template, {
          subject: requestBody?.subject,
          body: requestBody?.description,
          sender: fullname,
          name: requestBody?.toName,
        }),
      };

      await transporter.sendMail(mailOptions);

      await model.contact.create({
        ...requestBody,
        created_by: id,
        user_id: target_id,
      });

      res.status(200).json({
        cache,
        status: "OK",
        messages: "Contact success",
        data: null,
      });
    } catch (error) {
      res.status(error?.code ?? 500).json({
        cache: error?.cache,
        status: "ERROR",
        messages: error?.message ?? "Something wrong in our server",
        data: null,
      });
    }
  },
  // detail account
  getContact: async (req, res) => {
    try {
      const authorization = req.headers.authorization.slice(6).trim();
      const { id } = jwt.verify(authorization, process.env.APP_SECRET_KEY);

      let request,
        cache = false;

      const checkRedis = await redis.get(`contact_${id}`);

      if (checkRedis && checkRedis !== "null") {
        cache = true;
        request = JSON.parse(checkRedis);
      } else {
        model.contact.belongsTo(model.users, {
          foreignKey: {
            name: "user_id",
            allowNull: true,
          },
        });

        request = await model.contact.findAll({
          where: { created_by: id },
          include: [
            {
              model: model.users,
              required: true,
              attributes: ["id", "fullname", "email", "photo", "job_title"],
            },
          ],
          attributes: {
            exclude: ["created_by", "updatedAt"],
          },
        });

        redis.set(`contact_${id}`, JSON.stringify(request), "EX", 10);
      }

      res.status(200).json({
        cache,
        status: "OK",
        messages: "Contact success",
        data: request,
      });
    } catch (error) {
      res.status(error?.code ?? 500).json({
        cache: error?.cache,
        status: "ERROR",
        messages: error?.message ?? "Something wrong in our server",
        data: null,
      });
    }
  },

  // list account
  getAccountList: async (req, res) => {
    try {
      let request,
        cache = false;

      const limit = req?.query?.limit ?? 5;
      const page = ((req?.query?.page ?? 1) - 1) * limit;
      const checkRedis = await redis.get(
        `list_user_limit_${limit}_page_${page}`
      );
      const checkAllData = await redis.get(`count_list_user_page`);

      if (
        checkAllData &&
        (parseInt(req?.query?.page) ?? 1) > parseInt(checkAllData)
      ) {
        throw {
          cache,
          message: "Page not found",
          code: 400,
        };
      }

      if (checkRedis && checkRedis !== "null") {
        cache = true;
        request = JSON.parse(checkRedis);
      } else {
        request = await model.users.findAndCountAll({
          where: {
            role: {
              [Op.eq]: "user",
            },
          },
          attributes: { exclude: ["password", "role"] },
          offset: page,
          limit: limit,
        });

        redis.set(
          `list_user_limit_${limit}_page_${page}`,
          JSON.stringify(request),
          "EX",
          60
        );

        redis.set(
          `count_list_user_page`,
          Math.ceil(request?.count / limit),
          "EX",
          30
        );
      }

      res.status(200).json({
        cache,
        status: "OK",
        messages: "Job success",
        data: {
          current_page: parseInt(req?.query?.page) ?? 1,
          total_page: Math.ceil(request?.count / limit),
          ...request,
        },
      });
    } catch (error) {
      res.status(error?.code ?? 500).json({
        cache: error?.cache,
        status: "ERROR",
        messages: error?.message ?? "Something wrong in our server",
        data: null,
      });
    }
  },
  // Filter account
  filterAccountList: async (req, res) => {
    try {
      let request,
        cache = false;
      const keyword = req.query.keyword;

      request = await model.users.findAll({
        where: {
          role: {
            [Op.eq]: "user",
          },
          [Op.or]: [
            {
              fullname: {
                [Op.iLike]: `%${keyword}%`,
              },
            },
            {
              company: {
                [Op.iLike]: `%${keyword}%`,
              },
            },
            {
              job_title: {
                [Op.iLike]: `%${keyword}%`,
              },
            },
            {
              domicile: {
                [Op.iLike]: `%${keyword}%`,
              },
            },
            {
              skills: {
                [Op.contains]: [keyword],
              },
            },
          ],

          // skills: {
          //   [Op.iLike]: [`%${keyword}%`],
          // },
        },
        attributes: { exclude: ["password", "role"] },
      });

      console.log(request);

      res.status(200).json({
        cache,
        status: "OK",
        messages: "Job filter success",
        data: request,
      });
    } catch (error) {
      res.status(error?.code ?? 500).json({
        cache: error?.cache,
        status: "ERROR",
        messages: error?.message ?? "Something wrong in our server",
        data: null,
      });
    }
  },
  // get all account
  getAllAccount: async (req, res) => {
    try {
      let request,
        cache = false;

      request = await model.users.findAll({
        where: {
          role: {
            [Op.eq]: "user",
          },
        },
        attributes: { exclude: ["password", "role"] },
      });

      res.status(200).json({
        cache,
        status: "OK",
        messages: "Job success",
        data: request,
      });
    } catch (error) {
      res.status(error?.code ?? 500).json({
        cache: error?.cache,
        status: "ERROR",
        messages: error?.message ?? "Something wrong in our server",
        data: null,
      });
    }
  },
  // detail account
  getAccountById: async (req, res) => {
    try {
      const id = req.params.id;
      let request,
        cache = false;

      const checkRedis = await redis.get(`detail_${id}`);

      if (checkRedis && checkRedis !== "null") {
        cache = true;
        request = JSON.parse(checkRedis);
      } else {
        request = await model.users.findOne({
          where: { id },
          attributes: {
            exclude: ["password", "role", "updatedAt", "createdAt"],
          },
        });

        redis.set(`detail_${id}`, JSON.stringify(request), "EX", 10);
      }

      res.status(200).json({
        cache,
        status: "OK",
        messages: "Job detail success",
        data: request,
      });
    } catch (error) {
      res.status(error?.code ?? 500).json({
        cache: error?.cache,
        status: "ERROR",
        messages: error?.message ?? "Something wrong in our server",
        data: null,
      });
    }
  },
};
