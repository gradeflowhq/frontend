import React, { forwardRef } from 'react';
import {
  FiLock,
  FiChevronDown,
  FiPlus,
  FiCheckCircle,
  FiEye,
  FiChevronLeft,
  FiChevronRight,
  FiSave,
  FiLogOut,
  FiDownload,
  FiInbox,
  FiUpload,
  FiTrash2,
  FiEdit2,
  FiSettings,
  FiUsers,
  FiZap,
  FiFileText,
  FiAlertCircle,
  FiSearch,
  FiInfo,
  FiAlertTriangle,
} from 'react-icons/fi';
import { LuListChecks } from "react-icons/lu";
import { SiCanvas } from 'react-icons/si';


import type { SVGProps } from 'react';

const wrap = (Comp: React.ComponentType<SVGProps<SVGSVGElement>>) =>
  forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>((props, ref) => (
    <Comp ref={ref} {...props} className={props.className} />
  ));

// Export named icons (tree-shakable)
export const IconLock = wrap(FiLock);
export const IconChevronDown = wrap(FiChevronDown);
export const IconPlus = wrap(FiPlus);
export const IconCheckCircle = wrap(FiCheckCircle);
export const IconEye = wrap(FiEye);
export const IconChevronLeft = wrap(FiChevronLeft);
export const IconChevronRight = wrap(FiChevronRight);
export const IconSave = wrap(FiSave);
export const IconLogOut = wrap(FiLogOut);
export const IconDownload = wrap(FiDownload);
export const IconInbox = wrap(FiInbox);
export const IconUpload = wrap(FiUpload);
export const IconTrash = wrap(FiTrash2);
export const IconEdit = wrap(FiEdit2);
export const IconSettings = wrap(FiSettings);
export const IconAlertCircle = wrap(FiAlertCircle);
export const IconAlertTriangle = wrap(FiAlertTriangle);
export const IconUsers = wrap(FiUsers);
export const IconAssessment = wrap(FiFileText);
export const IconInfer = wrap(FiZap);
export const IconGrade = wrap(LuListChecks);
export const IconSearch = wrap(FiSearch);
export const IconCanvas = wrap(SiCanvas);
export const IconInfo = wrap(FiInfo);